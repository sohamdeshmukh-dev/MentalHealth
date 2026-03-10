"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

type View = "inbox" | "new" | "chat";

interface Room {
    id: string;
    name: string | null;
    is_group: boolean;
    display_name?: string; // For 1-on-1 chats
    avatar_url?: string;
}

interface Message {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: {
        display_name?: string;
        unique_code?: string;
        avatar_url?: string;
    };
}

interface Friend {
    id: string;
    display_name: string;
    unique_code: string;
    avatar_url: string;
}

export default function FloatingChat() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<View>("inbox");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [groupName, setGroupName] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [groupSettingsName, setGroupSettingsName] = useState("");
    const [groupSettingsAvatar, setGroupSettingsAvatar] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser(user);
                fetchInbox(user.id);
            }
        };
        checkUser();
    }, [supabase]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, view]);

    // Real-time Messages
    useEffect(() => {
        if (!activeRoom || view !== "chat") return;

        const channel = supabase
            .channel(`room-${activeRoom.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `room_id=eq.${activeRoom.id}`,
                },
                async (payload) => {
                    const { data: senderProfile } = await supabase
                        .from('profiles')
                        .select('display_name, unique_code, avatar_url')
                        .eq('id', payload.new.sender_id)
                        .single();

                    const messageWithSender = {
                        ...payload.new,
                        sender: senderProfile
                    } as Message;

                    setMessages((prev) => prev.some(m => m.id === messageWithSender.id) ? prev : [...prev, messageWithSender]);
                }
            )
            .subscribe();

        const roomChannel = supabase
            .channel(`room-updates-${activeRoom.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "chat_rooms",
                    filter: `id=eq.${activeRoom.id}`,
                },
                (payload) => {
                    const updatedRoom = payload.new;
                    setActiveRoom(prev => prev ? { ...prev, name: updatedRoom.name, display_name: updatedRoom.name || prev.display_name, avatar_url: updatedRoom.avatar_url } as Room : null);
                    if (currentUser) fetchInbox(currentUser.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(roomChannel);
        };
    }, [activeRoom, view, supabase, currentUser]);

    const fetchInbox = async (userId: string) => {
        setIsLoading(true);
        try {
            // Fetching from a VIEW is non-recursive and much safer for RLS
            const { data: inbox, error: iError } = await supabase
                .from("my_chat_inbox")
                .select("*");

            if (iError) throw iError;

            const roomList: Room[] = [];

            for (const item of inbox || []) {
                let roomData: Room = {
                    id: item.room_id,
                    name: item.room_name,
                    is_group: item.room_is_group
                };

                if (!item.room_is_group) {
                    // Use the PEERS view to find the other person
                    const { data: peer } = await supabase
                        .from("chat_peers")
                        .select("display_name, unique_code, avatar_url")
                        .eq("room_id", item.room_id)
                        .neq("peer_id", userId)
                        .limit(1)
                        .maybeSingle();

                    if (peer) {
                        roomData.display_name = peer.display_name || peer.unique_code || "Chat";
                        roomData.avatar_url = peer.avatar_url;
                    }
                } else {
                    if (!item.room_name) {
                        const { data: peers } = await supabase
                            .from("chat_peers")
                            .select("display_name, unique_code")
                            .eq("room_id", item.room_id)
                            .neq("peer_id", userId);

                        if (peers && peers.length > 0) {
                            roomData.display_name = peers.map(p => p.display_name || p.unique_code).join(', ');
                        }
                    }
                }
                roomList.push(roomData);
            }

            setRooms(roomList);
        } catch (err: any) {
            console.error("Inbox fetch error:", err?.message || err?.details || JSON.stringify(err) || err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFriends = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { data: allFriendships } = await supabase
                .from('friendships')
                .select(`
                    user_id,
                    friend_id,
                    sender:profiles!friendships_user_id_fkey(id, unique_code, avatar_url, display_name),
                    receiver:profiles!friendships_friend_id_fkey(id, unique_code, avatar_url, display_name)
                `)
                .eq('status', 'accepted')
                .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

            const accepted: Friend[] = [];
            allFriendships?.forEach((f) => {
                const friendProfile: any = f.user_id === currentUser.id ? f.receiver : f.sender;
                accepted.push({
                    id: friendProfile.id,
                    display_name: friendProfile.display_name || friendProfile.unique_code,
                    unique_code: friendProfile.unique_code,
                    avatar_url: friendProfile.avatar_url
                });
            });
            setFriends(accepted);
        } catch (err: any) {
            console.error("Friends fetch error:", err?.message || err?.details || JSON.stringify(err) || err);
        } finally {
            setIsLoading(false);
        }
    };

    const createRoom = async () => {
        if (selectedFriends.length === 0 || !currentUser) return;
        setIsLoading(true);
        try {
            const isGroup = selectedFriends.length > 1;
            const rName = isGroup ? (groupName || "New Group") : null;
            const allParticipants = [currentUser.id, ...selectedFriends];

            // Use RPC to create room and participants in one atomic, non-recursive call
            const { data: roomId, error: rErr } = await supabase
                .rpc('create_chat_room_v2', {
                    p_name: rName,
                    p_is_group: isGroup,
                    p_participant_ids: allParticipants
                });

            if (rErr) throw rErr;

            // Switch to Chat View
            setSelectedFriends([]);
            setGroupName("");
            fetchMessages(roomId);
            setActiveRoom({ id: roomId, name: rName, is_group: isGroup, display_name: rName || "Chat" });
            setView("chat");
            fetchInbox(currentUser.id);
        } catch (err: any) {
            console.error("Create room error:", err?.message || err?.details || JSON.stringify(err) || err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async (roomId: string) => {
        try {
            const { data } = await supabase
                .from('messages')
                .select('*, sender:profiles(display_name, unique_code, avatar_url)')
                .eq('room_id', roomId)
                .order("created_at", { ascending: true });
            setMessages(data || []);
        } catch (err: any) {
            console.error("Fetch messages error:", err?.message || err?.details || JSON.stringify(err) || err);
        }
    };

    const handleDeleteChat = async (roomId: string) => {
        try {
            await supabase.from('chat_rooms').delete().eq('id', roomId);
            setRooms((prev) => prev.filter(r => r.id !== roomId));
            if (activeRoom && activeRoom.id === roomId) {
                setView('inbox');
                setActiveRoom(null);
            }
        } catch (err: any) {
            console.error("Delete room error:", err?.message || err?.details || JSON.stringify(err) || err);
        }
    };

    const fetchGroupMembers = async (roomId: string) => {
        try {
            const { data } = await supabase
                .from('chat_participants')
                .select('profiles(display_name, unique_code, avatar_url)')
                .eq('room_id', roomId);
            if (data) {
                setGroupMembers(data.map((d: any) => d.profiles));
            }
        } catch (err: any) {
            console.error("Fetch members error:", err);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activeRoom) return;
        const file = e.target.files[0];
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${activeRoom.id}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('chat_images').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('chat_images').getPublicUrl(filePath);
            setGroupSettingsAvatar(publicUrl);
        } catch (err: any) {
            console.error("Image upload error:", err?.message || err?.details || JSON.stringify(err) || err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveGroupSettings = async () => {
        if (!activeRoom) return;
        try {
            const { error } = await supabase
                .from('chat_rooms')
                .update({ name: groupSettingsName, avatar_url: groupSettingsAvatar })
                .eq('id', activeRoom.id);
            if (error) throw error;
            setActiveRoom({ ...activeRoom, name: groupSettingsName, display_name: groupSettingsName, avatar_url: groupSettingsAvatar });
            setShowGroupSettings(false);
            fetchInbox(currentUser.id);
        } catch (err: any) {
            console.error("Save settings error:", err?.message || err?.details || JSON.stringify(err) || err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeRoom || !currentUser) return;

        const messageText = newMessage.trim();

        const msgId = crypto.randomUUID();
        // 1. Instantly clear the input so it feels fast
        setNewMessage('');

        // 2. Optimistically add the message to the UI instantly
        const optimisticMsg: Message = {
            id: msgId, // temporary ID
            room_id: activeRoom.id,
            sender_id: currentUser.id,
            content: messageText,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            // 3. Actually send it to Supabase
            const { error } = await supabase
                .from('messages')
                .insert({
                    id: msgId,
                    room_id: activeRoom.id,
                    sender_id: currentUser.id,
                    content: messageText
                });

            if (error) throw error;
        } catch (err: any) {
            // 4. Bulletproof error logging so we can see if RLS blocked it
            console.error("Error sending message:", err?.message || err?.details || JSON.stringify(err) || err);

            // Optional: Remove the optimistic message if it failed to send
            setMessages((prev) => prev.filter(msg => msg.id !== optimisticMsg.id));
        }
    };

    if (!currentUser) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {/* Chat Body */}
            {isOpen && (
                <div className="mb-4 w-[350px] h-[600px] bg-white dark:bg-black border-[8px] border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-md relative z-10">
                        <div className="flex items-center gap-1 w-1/4">
                            {view !== "inbox" && (
                                <button onClick={() => setView("inbox")} className="text-blue-500 hover:text-blue-600 transition flex items-center gap-0.5" title="Back">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                    <span className="text-[15px] font-medium hidden sm:inline">Back</span>
                                </button>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
                            {view === "chat" ? (
                                <>
                                    {activeRoom?.avatar_url ? (
                                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-black/5 dark:border-white/5 overflow-hidden shrink-0">
                                            <img src={activeRoom.avatar_url} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-gray-300 to-gray-400 flex items-center justify-center text-[12px] text-white shrink-0">
                                            {activeRoom?.is_group ? "👥" : "👤"}
                                        </div>
                                    )}
                                    <span className="text-[11px] font-bold text-black dark:text-white mt-0.5 truncate max-w-full text-center">
                                        {activeRoom?.display_name || activeRoom?.name || "Chat"}
                                        {activeRoom?.is_group && <span className="text-gray-400 font-normal ml-1 pr-1">›</span>}
                                    </span>
                                </>
                            ) : (
                                <h3 className="text-base font-semibold text-black dark:text-white truncate">
                                    {view === "inbox" && "Messages"}
                                    {view === "new" && "New Message"}
                                </h3>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 w-1/4">
                            {view === "chat" && activeRoom?.is_group && (
                                <button
                                    onClick={() => {
                                        setShowGroupSettings(!showGroupSettings);
                                        if (!showGroupSettings) {
                                            setGroupSettingsName(activeRoom.name || "");
                                            setGroupSettingsAvatar(activeRoom.avatar_url || "");
                                            fetchGroupMembers(activeRoom.id);
                                        }
                                    }}
                                    className="text-blue-500 hover:text-blue-600 transition p-1"
                                    title="Group Info"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-1 shrink-0" title="Close">
                                <span className="font-bold text-sm bg-gray-200 dark:bg-gray-800 rounded-full h-6 w-6 flex items-center justify-center text-gray-500 dark:text-gray-400">✕</span>
                            </button>
                        </div>
                    </div>

                    {/* Views */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={scrollRef}>
                        {view === "inbox" && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => { setView("new"); fetchFriends(); }}
                                    className="w-full p-3 rounded-xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 transition flex items-center justify-center gap-2 text-xs text-slate-400"
                                >
                                    <span>➕</span> Start New Chat
                                </button>

                                {rooms.map(room => (
                                    <div
                                        key={room.id}
                                        className="relative group p-3 rounded-2xl border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/50 transition flex items-center gap-3"
                                    >
                                        <div className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer" onClick={() => { setActiveRoom(room); setView("chat"); fetchMessages(room.id); }}>
                                            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/5">
                                                {room.avatar_url ? <img src={room.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[14px]">💬</span>}
                                            </div>
                                            <div className="flex-1 min-w-0 border-b border-gray-100 dark:border-gray-800 pb-2 pt-1 group-last:border-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-[15px] font-semibold text-black dark:text-white truncate pr-2">{room.display_name || room.name || "Unnamed Chat"}</div>
                                                    <div className="text-[13px] text-gray-400 hidden group-hover:block transition-all mr-6">›</div>
                                                </div>
                                                <div className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate flex items-center gap-1">
                                                    {room.is_group && <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500">Grp</span>}
                                                    iMessage...
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteChat(room.id); }}
                                            className="absolute right-3 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition bg-white dark:bg-black shadow-sm"
                                            title="Delete Chat"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}

                                {rooms.length === 0 && !isLoading && (
                                    <div className="text-center py-8 text-slate-500 text-xs">No active chats</div>
                                )}
                            </div>
                        )}

                        {view === "new" && (
                            <div className="space-y-4">
                                {friends.length > 0 && selectedFriends.length > 1 && (
                                    <input
                                        type="text"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="Group Name (Optional)"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-500/40 outline-none"
                                    />
                                )}

                                <div className="space-y-2">
                                    {friends.map(friend => (
                                        <label key={friend.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition">
                                            <input
                                                type="checkbox"
                                                checked={selectedFriends.includes(friend.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedFriends(p => [...p, friend.id]);
                                                    else setSelectedFriends(p => p.filter(id => id !== friend.id));
                                                }}
                                                className="rounded border-white/10 bg-white/5 text-teal-500 focus:ring-teal-500"
                                            />
                                            <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
                                                {friend.avatar_url && <img src={friend.avatar_url} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-white truncate">{friend.display_name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">#{friend.unique_code}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <button
                                    onClick={createRoom}
                                    disabled={selectedFriends.length === 0 || isLoading}
                                    className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition-all"
                                >
                                    {isLoading ? "Creating..." : "Start Chat"}
                                </button>
                            </div>
                        )}

                        {view === "chat" && showGroupSettings && (
                            <div className="space-y-4 mb-4 p-4 border border-white/10 rounded-xl bg-white/[0.02] animate-in slide-in-from-top-2">
                                <h4 className="text-xs font-bold text-white mb-2">Group Settings</h4>
                                <input
                                    type="text"
                                    value={groupSettingsName}
                                    onChange={(e) => setGroupSettingsName(e.target.value)}
                                    placeholder="Group Name"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-teal-500/40 outline-none mb-2"
                                />
                                <div className="mb-3 space-y-2">
                                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Group Picture</label>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 shrink-0 rounded-full bg-white/[0.05] border border-white/10 overflow-hidden flex items-center justify-center">
                                            {groupSettingsAvatar ? (
                                                <img src={groupSettingsAvatar} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            )}
                                        </div>
                                        <div className="flex-1 relative">
                                            <input
                                                type="file"
                                                accept="image/png, image/jpeg, image/webp"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <div className="w-full bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors rounded-lg px-3 py-2 text-xs text-gray-300 flex justify-center items-center">
                                                {isUploading ? "Uploading..." : "Choose Image..."}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveGroupSettings}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2 rounded-lg shadow-sm transition-all"
                                >
                                    Save Changes
                                </button>

                                <div className="mt-4">
                                    <h4 className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Members</h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                        {groupMembers.map((m, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-slate-800 border border-white/5 overflow-hidden">
                                                    {m?.avatar_url && <img src={m.avatar_url} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-white truncate">{m?.display_name || m?.unique_code || "Anonymous"}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === "chat" && !showGroupSettings && (
                            <div className="space-y-4 pb-2">
                                {messages.map(msg => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    return (
                                        <div key={msg.id} className="flex flex-col w-full">
                                            {activeRoom?.is_group && !isMe && (
                                                <p className="text-[10px] text-gray-500 ml-12 mb-0.5">
                                                    {msg.sender?.display_name || msg.sender?.unique_code || 'User'}
                                                </p>
                                            )}
                                            <div className={`flex items-end gap-2 w-full ${isMe ? "justify-end" : "justify-start"}`}>
                                                {!isMe && (
                                                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0 overflow-hidden shadow-sm flex items-center justify-center">
                                                        <img src={msg.sender?.avatar_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div
                                                    className={`max-w-[75%] px-4 py-2 text-[15px] leading-[1.3] shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${isMe
                                                        ? "bg-blue-500 text-white rounded-[20px] rounded-br-[4px]"
                                                        : "bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-[20px] rounded-bl-[4px]"
                                                        }`}
                                                >
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {messages.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-[11px] font-medium tracking-wide">iMessage</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    {
                        view === "chat" && (
                            <div className="p-3 bg-white/80 dark:bg-black/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-10 shrink-0">
                                <form onSubmit={handleSendMessage} className="relative flex items-center">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="iMessage"
                                        className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-full pl-4 pr-10 py-[6px] text-[15px] text-black dark:text-white focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 placeholder:text-gray-400 transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="absolute right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white disabled:opacity-0 transition-opacity duration-200"
                                    >
                                        <svg className="w-4 h-4 ml-0.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                    </button>
                                </form>
                            </div>
                        )
                    }
                </div >
            )
            }

            {/* Float Trigger */}
            {
                !isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="p-4 bg-blue-500 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-transform hover:scale-105 active:scale-95"
                    >
                        <svg className="w-8 h-8 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                )
            }
        </div >
    );
}
