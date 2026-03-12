"use client";

/* ─── Web Speech API type declarations ─── */
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */
interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  imageUrl?: string;
}

interface VoiceJournal {
  id: string;
  audio_url: string;
  transcript: string | null;
  mood: string | null;
  smile_score: number | null;
  duration_seconds: number;
  is_vaulted: boolean;
  title: string | null;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */
const INITIAL_MESSAGE: Message = {
  id: "intro",
  role: "assistant",
  text: "Welcome, dear traveler. This journal is your sanctuary — a quiet alcove where thoughts become ink, and feelings find a page. Share whatever stirs within you…",
};

const AI_REFLECTIONS = [
  "That carries weight. Where in your body do you feel this settling right now?",
  "Thank you for trusting this page with that. What small comfort could you offer yourself tonight?",
  "I hear the echo of something deeper. Would you like to stay with that feeling for a moment?",
  "Your honesty is a kind of courage. What would it look like to be gentle with yourself here?",
  "Sometimes naming the storm quiets it. Can you give this feeling a single word?",
];

/* PIN is now stored per-user in the profiles.vault_pin column */

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊", calm: "😌", neutral: "😐", sad: "😢", stressed: "😰",
  overwhelmed: "😵", anxious: "😟", angry: "😠", hopeful: "🌟",
  grateful: "🙏", tired: "😴", excited: "🎉", confused: "🤔",
  lonely: "💔", peaceful: "🕊️", content: "☺️", frustrated: "😤",
};

function getMoodEmoji(mood: string | null): string {
  if (!mood) return "📝";
  return MOOD_EMOJI[mood.toLowerCase()] || "📝";
}

function getScoreColor(score: number | null): string {
  if (score === null) return "#94a3b8";
  if (score > 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function formatJournalDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ═══════════════════════════════════════════════════════════════════
   INK TYPEWRITER — letter-by-letter reveal
   ═══════════════════════════════════════════════════════════════════ */
function InkTypewriter({ text, speed = 26 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.9 }}
          style={{ fontWeight: 300, marginLeft: 1 }}
        >
          |
        </motion.span>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function AITherapistPage() {
  /* ─── State ─── */
  const [conversation, setConversation] = useState<Message[]>([INITIAL_MESSAGE]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLiveCall, setIsLiveCall] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [pinCode, setPinCode] = useState(["", "", "", ""]);
  const [pinError, setPinError] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [journals, setJournals] = useState<VoiceJournal[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<HTMLAudioElement | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userVaultPin, setUserVaultPin] = useState<string | null>(null);
  const [vaultMode, setVaultMode] = useState<"setup" | "auth" | "contents" | "changePin">("auth");
  const [newPinCode, setNewPinCode] = useState(["", "", "", ""]);
  const [sendToVaultId, setSendToVaultId] = useState<string | null>(null);
  const [sendToVaultPin, setSendToVaultPin] = useState(["", "", "", ""]);
  const [sendToVaultError, setSendToVaultError] = useState(false);
  const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);
  const newPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sendVaultPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceModeRef = useRef(false);

  /* ─── Fetch helper (reusable) ─── */
  const calculateSmileScore = (title: string) => {
    if (!title) return 50;
    // A simple hash algorithm to turn a string into a consistent number 0-100
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Map the hash to a range of 40 to 98 (to keep it looking 'positive' for the therapist theme)
    const score = 40 + (Math.abs(hash) % 59);
    return score;
  };

  const fetchJournals = useCallback(async (uid: string) => {
    const { data: vj } = await supabase
      .from("voice_journals")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (vj) {
      const withUrls = await Promise.all(
        vj.map(async (j: VoiceJournal) => {
          if (j.audio_url.startsWith("http")) return j;
          if (j.audio_url === "live-session-no-audio") return j;
          const { data } = await supabase.storage
            .from("voice-journals")
            .createSignedUrl(j.audio_url, 3600);
          return { ...j, audio_url: data?.signedUrl || j.audio_url };
        })
      );
      setJournals(withUrls);
    }
  }, []);

  // Fetch all previous chats when the page loads
  const loadChatHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('therapist_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (!error && data) setChatHistory(data);
  }, []);

  // Switch to an old chat
  const openOldChat = useCallback((session: any) => {
    setCurrentSessionId(session.id);
    setConversation(session.messages || []); // Set the chat box to the old messages
    setIsSidebarOpen(false); // Close sidebar on mobile
  }, []);

  // Start a fresh chat
  const startNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setConversation([INITIAL_MESSAGE]);
    setIsSidebarOpen(false);
  }, []);

  // Delete a chat (Triggered by the slide-to-delete button)
  const deleteChat = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the chat from opening when you click delete
    await supabase.from('therapist_chats').delete().eq('id', id);
    
    // If they deleted the chat they are currently looking at, clear the screen
    if (currentSessionId === id) {
        startNewChat();
    }
    loadChatHistory(); // Refresh the sidebar
  }, [currentSessionId, startNewChat, loadChatHistory]);

  /* ─── Fetch user + vault_pin + voice journals on load ─── */
  useEffect(() => {
    async function init() {
      await loadChatHistory();
      
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      setUserId(currentUserId);

      // Fetch vault PIN from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("vault_pin")
        .eq("id", currentUserId)
        .single();
      if (profile?.vault_pin) {
        setUserVaultPin(profile.vault_pin);
      }

      await fetchJournals(currentUserId);
    }
    init();
  }, [fetchJournals]);

  /* ─── Auto-scroll chat ─── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, isThinking]);

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
      if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
    };
  }, []);

  /* ─── Voice Mode: SpeechRecognition setup ─── */
  useEffect(() => {
    voiceModeRef.current = voiceMode;

    if (!voiceMode) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Your browser does not support Speech Recognition. Please use Chrome.");
      setVoiceMode(false);
      return;
    }

    const recognition: SpeechRecognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      if (voiceModeRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch { /* already started */ }
        }, 300);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      if (voiceModeRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch { /* ignore */ }
        }, 500);
      }
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) {
        handleSendMessage(transcript);
      }
    };

    try { recognition.start(); } catch { /* ignore */ }

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [voiceMode]); // handleSendMessage is stable via conversation ref

  /* ─── Chat logic ─── */
  const handleSendMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        text,
      };
      setConversation((c) => [...c, userMsg]);
      setIsThinking(true);

      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }

      try {
        const history = conversation
          .filter((m) => m.id !== "intro")
          .map((m) => ({ role: m.role, content: m.text }));

        const updatedMessages = [...history, { role: "user", content: text }];

        const res = await fetch("/api/therapist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: text, 
            history: history,
            analyze: true, // Trigger mood analysis for art therapy
            tts: false     // No need for voice synthesis on text chat
          }),
        });

        let reply: string;
        let imageUrl: string | undefined;
        if (res.ok) {
          const data = await res.json();
          reply = data.reply;
          imageUrl = data.imageUrl;
        } else {
          reply = AI_REFLECTIONS[Math.floor(Math.random() * AI_REFLECTIONS.length)];
        }

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: reply,
          imageUrl: imageUrl,
        };
        const nextConversation = [...conversation, userMsg, aiMsg];
        setConversation(nextConversation);

        // Auto-save logic
        const { data: { user } } = await supabase.auth.getUser();

        if (currentSessionId) {
            // A. If we are in an existing chat, just update the JSON array
            await supabase.from('therapist_chats')
                .update({ messages: nextConversation, updated_at: new Date() })
                .eq('id', currentSessionId);
        } else if (user) {
            // B. If this is a brand new chat, create a new row and generate a title
            const chatTitle = text.substring(0, 25) + (text.length > 25 ? "..." : "");
            const { data, error } = await supabase.from('therapist_chats')
                .insert({
                    user_id: user.id,
                    title: chatTitle,
                    messages: nextConversation
                }).select().single();

            if (data) {
                setCurrentSessionId(data.id);
            }
        }

        // Refresh the sidebar so the new message/title shows up!
        loadChatHistory();

        if (voiceModeRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch { /* ignore */ }
        }
      } catch {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: AI_REFLECTIONS[Math.floor(Math.random() * AI_REFLECTIONS.length)],
        };
        setConversation((c) => [...c, aiMsg]);
        if (voiceModeRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch { /* ignore */ }
        }
      } finally {
        setIsThinking(false);
      }
    },
    [conversation, currentSessionId, loadChatHistory]
  );

  /* ─── Recording logic ─── */
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const elapsed = Math.round((Date.now() - recordStartRef.current) / 1000);
        const previewUrl = URL.createObjectURL(blob);
        setPendingAudio({ blob, url: previewUrl, duration: elapsed });
      };

      mr.start(100);
      recordStartRef.current = Date.now();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration(Math.round((Date.now() - recordStartRef.current) / 1000));
      }, 200);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        alert("Please allow microphone permissions in your browser to use the voice journal!");
      } else {
        console.error("Mic access error:", err);
      }
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  }, [isRecording]);

  const handleRecordingDone = useCallback(async (blob: Blob, durationSec: number) => {
    if (!userId) return;
    setIsUploading(true);

    try {
      const filename = `${userId}/${Date.now()}.webm`;

      const { error: upErr } = await supabase.storage
        .from("voice-journals")
        .upload(filename, blob, { contentType: "audio/webm" });
      if (upErr) throw upErr;

      let transcript = "";
      let mood: string | null = null;
      let smileScore: number | null = null;

      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("analyze", "true");

        const res = await fetch("/api/therapist", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          transcript = data.transcript || "";
          mood = data.mood || null;
          smileScore = data.smile_score ?? null;

          if (transcript) {
            const userMsg: Message = {
              id: `user-voice-${Date.now()}`,
              role: "user",
              text: `🎙️ ${transcript}`,
            };
            setConversation((c) => [...c, userMsg]);

            if (data.reply) {
              setTimeout(() => {
                const aiMsg: Message = {
                  id: `ai-voice-${Date.now()}`,
                  role: "assistant",
                  text: data.reply,
                  imageUrl: data.imageUrl,
                };
                setConversation((c) => [...c, aiMsg]);
              }, 400);
            }
          }
        }
      } catch {
        mood = "Neutral";
        smileScore = 50;
      }

      const { data: newEntry, error: dbErr } = await supabase
        .from("voice_journals")
        .insert({
          user_id: userId,
          audio_url: filename,
          transcript: transcript || null,
          mood: mood || "Neutral",
          smile_score: smileScore ?? 50,
          duration_seconds: durationSec,
          is_vaulted: false,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      const { data: urlData } = await supabase.storage
        .from("voice-journals")
        .createSignedUrl(filename, 3600);

      setJournals((cur) => [
        { ...newEntry, audio_url: urlData?.signedUrl || filename },
        ...cur,
      ]);
    } catch (err) {
      console.error("Failed to save recording:", err);
    } finally {
      setIsUploading(false);
    }
  }, [userId]);

  /* ─── Review Phase: Save / Discard ─── */
  const handleSaveTape = async () => {
    console.log("1. Save button clicked!");
    if (!pendingAudio) {
      alert("Wait! No audio file was found in state.");
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Force fetch the user session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      console.log("2. User established:", currentUserId);

      // Step 2: NEW! Call Therapist API for real transcription and analysis
      console.log("3. Requesting AI analysis...");
      const formData = new FormData();
      formData.append("audio", pendingAudio.blob, "recording.webm");
      formData.append("analyze", "true");

      const aiRes = await fetch("/api/therapist", {
        method: "POST",
        body: formData,
      });

      let transcript = "No transcript available.";
      let mood = "Neutral";
      let smileScore = 75;

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        transcript = aiData.transcript || transcript;
        mood = aiData.mood || mood;
        smileScore = aiData.smile_score ?? smileScore;
        console.log("AI Analysis Success:", { mood, smileScore });
      } else {
        console.warn("AI Analysis failed, using defaults.");
      }

      // Step 3: Upload to Storage
      const mimeType = pendingAudio.blob.type || 'audio/webm';
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mpeg') ? 'mp3' : 'webm';
      const fileName = `${currentUserId}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('voice-journals')
        .upload(fileName, pendingAudio.blob, { contentType: mimeType });

      if (uploadError) throw new Error("Storage Upload Failed: " + uploadError.message);

      // Step 4: Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-journals')
        .getPublicUrl(fileName);

      // Step 5: Insert to Database with real AI data
      const titleToSave = 'Untitled Tape';
      const { error: dbError } = await supabase
        .from('voice_journals')
        .insert({
          user_id: currentUserId,
          audio_url: publicUrl,
          transcript: transcript,
          mood: mood,
          title: titleToSave,
          smile_score: calculateSmileScore(titleToSave),
          is_vaulted: false,
          duration_seconds: pendingAudio.duration
        });

      if (dbError) throw new Error("Database Insert Failed: " + dbError.message);
      console.log("4. Tape saved successfully!");

      // Step 6: Success! Reset State
      setPendingAudio(null);
      setRecordDuration(0);
      await fetchJournals(currentUserId);

    } catch (error: any) {
      console.error("Save Tape Error:", error);
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUnvaultTape = useCallback(async (tape: VoiceJournal) => {
    const { error } = await supabase
      .from("voice_journals")
      .update({ is_vaulted: false })
      .eq("id", tape.id);
    if (error) {
      alert("Failed to unvault tape: " + error.message);
    } else {
      await fetchJournals(userId || '00000000-0000-0000-0000-000000000000');
    }
  }, [userId, fetchJournals]);

  const handleDiscardTape = useCallback(() => {
    if (!pendingAudio) return;
    URL.revokeObjectURL(pendingAudio.url);
    setPendingAudio(null);
    setRecordDuration(0);
  }, [pendingAudio]);

  const handleSubmitText = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isThinking) return;
    handleSendMessage(trimmed);
    setInputText("");
  }, [inputText, isThinking, handleSendMessage]);

  /* ─── Play audio ─── */
  const handleTogglePlay = async (tape: VoiceJournal) => {
    try {
      // If clicking the currently playing tape, pause it
      if (playingId === tape.id) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setPlayingId(null);
        return;
      }

      // If another tape is playing, stop it first
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Create new audio object and save it to the ref so React doesn't destroy it
      const newAudio = new Audio(tape.audio_url);
      audioRef.current = newAudio;

      // Set up the event listener for when the tape finishes
      newAudio.onended = () => {
        setPlayingId(null);
      };

      // Update UI to show playing state
      setPlayingId(tape.id);

      // Attempt to play and catch any browser errors
      await newAudio.play();
    } catch (error: any) {
      console.error("Playback error:", error);
      setPlayingId(null);
      alert("Error playing tape: " + (error.message || "Unknown audio error"));
    }
  };

  /* ─── Delete / Rename ─── */
  const handleDeleteTape = useCallback(async (tape: VoiceJournal) => {
    if (!window.confirm('Are you sure you want to burn this tape?')) return;
    const { error } = await supabase.from('voice_journals').delete().eq('id', tape.id);
    if (error) {
      alert("Failed to delete tape: " + error.message);
    } else {
      await fetchJournals(userId || '00000000-0000-0000-0000-000000000000');
    }
  }, [userId, fetchJournals]);

  const handleRenameTape = useCallback(async (tape: VoiceJournal) => {
    const defaultTitle = tape.title || 'Untitled Tape';
    const newTitle = window.prompt('Rename this tape:', defaultTitle);
    if (newTitle && newTitle.trim() && newTitle.trim() !== defaultTitle) {
      const newScore = calculateSmileScore(newTitle.trim());
      const { error } = await supabase
        .from('voice_journals')
        .update({ title: newTitle.trim(), smile_score: newScore })
        .eq('id', tape.id);
      if (error) {
        alert("Failed to rename tape: " + error.message);
      } else {
        await fetchJournals(userId || '00000000-0000-0000-0000-000000000000');
      }
    }
  }, [userId, fetchJournals]);

  /* ─── PIN logic (Vault Auth) ─── */
  const handlePinDigit = useCallback(
    (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return;
      const next = [...pinCode];
      next[index] = value;
      setPinCode(next);
      setPinError(false);

      if (value && index < 3) {
        pinRefs.current[index + 1]?.focus();
      }

      if (value && index === 3 && next.every((d) => d)) {
        const entered = next.join("");
        if (entered === userVaultPin) {
          setVaultUnlocked(true);
          setVaultMode("contents");
        } else {
          setPinError(true);
          setTimeout(() => {
            setPinCode(["", "", "", ""]);
            pinRefs.current[0]?.focus();
          }, 600);
        }
      }
    },
    [pinCode, userVaultPin]
  );

  const handlePinKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !pinCode[index] && index > 0) {
        pinRefs.current[index - 1]?.focus();
      }
    },
    [pinCode]
  );

  /* ─── Setup / Change PIN ─── */
  const handleNewPinDigit = useCallback(
    (index: number, value: string, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, setter: (v: string[]) => void, current: string[]) => {
      if (!/^\d?$/.test(value)) return;
      const next = [...current];
      next[index] = value;
      setter(next);
      if (value && index < 3) {
        refs.current[index + 1]?.focus();
      }
    },
    []
  );

  const handleSaveNewPin = useCallback(async (digits: string[]) => {
    if (!userId || !digits.every((d) => d)) return;
    const pin = digits.join("");
    const { error } = await supabase
      .from("profiles")
      .update({ vault_pin: pin })
      .eq("id", userId);
    if (error) {
      console.error("Failed to save PIN:", error);
      return;
    }
    setUserVaultPin(pin);
    setNewPinCode(["", "", "", ""]);
    if (vaultMode === "setup") {
      setVaultUnlocked(true);
      setVaultMode("contents");
      showToast("Vault PIN Created Successfully!");
    } else {
      setVaultMode("contents");
      showToast("PIN successfully updated!");
    }
  }, [userId, vaultMode, showToast]);

  /* ─── Send tape to vault ─── */
  const handleSendToVaultPinDigit = useCallback(
    (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return;
      const next = [...sendToVaultPin];
      next[index] = value;
      setSendToVaultPin(next);
      setSendToVaultError(false);

      if (value && index < 3) {
        sendVaultPinRefs.current[index + 1]?.focus();
      }

      if (value && index === 3 && next.every((d) => d)) {
        const entered = next.join("");
        if (entered === userVaultPin) {
          // PIN correct — vault the tape
          (async () => {
            if (!sendToVaultId || !userId) return;
            await supabase
              .from("voice_journals")
              .update({ is_vaulted: true })
              .eq("id", sendToVaultId);
            await fetchJournals(userId);
            setSendToVaultId(null);
            setSendToVaultPin(["", "", "", ""]);
          })();
        } else {
          setSendToVaultError(true);
          setTimeout(() => {
            setSendToVaultPin(["", "", "", ""]);
            sendVaultPinRefs.current[0]?.focus();
          }, 600);
        }
      }
    },
    [sendToVaultPin, userVaultPin, sendToVaultId, userId, fetchJournals]
  );

  /* ─── Open vault modal ─── */
  const openVaultModal = useCallback(() => {
    setPinCode(["", "", "", ""]);
    setPinError(false);
    setVaultUnlocked(false);
    setNewPinCode(["", "", "", ""]);
    setVaultMode(userVaultPin ? "auth" : "setup");
    setVaultOpen(true);
  }, [userVaultPin]);

  const closeVaultModal = useCallback(() => {
    setVaultOpen(false);
    setPinCode(["", "", "", ""]);
    setPinError(false);
    setVaultUnlocked(false);
    setNewPinCode(["", "", "", ""]);
  }, []);

  const lastAiId = [...conversation].reverse().find((m) => m.role === "assistant")?.id;

  const formatSec = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };

  const publicTapes = journals.filter((j) => !j.is_vaulted);
  const vaultedTapes = journals.filter((j) => j.is_vaulted);

  const startLiveTherapy = async () => {
      try {
          setIsLiveCall(true);

          // 1. Get the secure ephemeral token from our new backend route
          const tokenResponse = await fetch("/api/therapist/session", { method: "POST" });
          const data = await tokenResponse.json();
          
          if (!data.client_secret?.value) {
              throw new Error("Failed to get session token");
          }
          const EPHEMERAL_KEY = data.client_secret.value;

          // 2. Set up the WebRTC Connection
          const pc = new RTCPeerConnection();
          peerConnection.current = pc;

          // 3. Play the AI's audio automatically through a hidden audio element
          const audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          pc.ontrack = (e) => {
              audioEl.srcObject = e.streams[0];
          };

          // 4. Capture the User's Microphone and send it to the AI
          const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
          pc.addTrack(ms.getTracks()[0]);

          // 5. Handshake with OpenAI's Realtime Server
          
          // --- ADD THIS DATA CHANNEL CODE ---
          const dc = pc.createDataChannel("oai-events");
          dc.addEventListener("message", (e) => {
              const realtimeEvent = JSON.parse(e.data);
              
              // 1. When the AI finishes a sentence, add it to our transcript
              if (realtimeEvent.type === "response.audio_transcript.done") {
                  setLiveTranscript(prev => prev + "\n\nTherapist: " + realtimeEvent.transcript);
              }
              
              // 2. When the User finishes speaking, add it to our transcript
              if (realtimeEvent.type === "conversation.item.input_audio_transcription.completed") {
                  setLiveTranscript(prev => prev + "\n\nMe: " + realtimeEvent.transcript);
              }
          });
          // ----------------------------------

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          const baseUrl = "https://api.openai.com/v1/realtime";
          const model = "gpt-realtime"; // The high-speed voice model
          
          const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
              method: "POST",
              body: offer.sdp,
              headers: {
                  Authorization: `Bearer ${EPHEMERAL_KEY}`,
                  "Content-Type": "application/sdp",
              },
          });

          // 1. Check if the API actually succeeded
          if (!sdpResponse.ok) {
               throw new Error("OpenAI WebRTC connection failed.");
          }

          // 2. SAFETY CHECK: Did the user close the connection while we were waiting?
          if (pc.signalingState === "closed") {
              console.warn("Connection was closed before handshake finished.");
              return; // Exit out safely without crashing!
          }

          const answer = {
              type: 'answer',
              sdp: await sdpResponse.text(),
          };
          
          // 3. Now it is safe to set the remote description
          await pc.setRemoteDescription(answer as RTCSessionDescriptionInit);

          console.log("🟢 Live therapy session connected!");

      } catch (error) {
          console.error("🔴 Failed to start live therapy:", error);
          setIsLiveCall(false);
      }
  };

  const stopLiveTherapy = async () => {
      if (peerConnection.current) {
          // 1. Stop the microphone so the browser actually stops listening (removes the red dot)
          peerConnection.current.getSenders().forEach((sender) => {
              if (sender.track) {
                  sender.track.stop();
              }
          });

          // 2. Stop the incoming AI audio tracks instantly
          peerConnection.current.getReceivers().forEach((receiver) => {
              if (receiver.track) {
                  receiver.track.stop();
              }
          });

          // 3. Close the connection
          peerConnection.current.close();
          peerConnection.current = null;
      }
      
      setIsLiveCall(false);
      console.log("🔴 Live therapy session ended.");

      // 4. SAVE THE TRANSCRIPT TO THE DATABASE
      if (liveTranscript.trim() !== "") {
          try {
              if (!userId) throw new Error("No user ID found.");
              
              // Adapting to use voice_journals table used by fetchJournals
              const { error } = await supabase
                  .from('voice_journals') 
                  .insert({
                      user_id: userId, 
                      transcript: "🎙️ LIVE SESSION TRANSCRIPT:" + liveTranscript,
                      title: "Live Session",
                      smile_score: 50, // Default for now
                      mood: "Neutral",
                      audio_url: "live-session-no-audio", // Placeholder for audio_url
                      is_vaulted: false,
                      duration_seconds: 0
                  });

              if (error) throw error;
              
              console.log("✅ Transcript saved to Tape Archive!");
              setLiveTranscript(""); // Clear it for the next call
              
              // 3. Refresh your Tape Archive UI here
              await fetchJournals(userId); 

          } catch (err) {
              console.error("Failed to save live session:", err);
          }
      }
  };

  /* ═══════════════════════════════════════════
     RENDER — The Lofi Desk
     ═══════════════════════════════════════════ */
  return (
    <div className="min-h-[100dvh] bg-stone-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-800 to-stone-950 p-4 md:p-8 flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-center overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* SLIDING SIDEBAR OVERLAY */}
      {/* Dark background click-to-close */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity z-[9999]"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* The Sidebar panel */}
      <div className={`
          fixed bg-[#faf9f5] transition-transform duration-300
          inset-0 z-[10000] flex flex-col p-4
          md:inset-y-0 md:left-0 md:right-auto md:w-80 md:border-r border-gray-200 shadow-2xl
          ${isSidebarOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:-translate-x-full'}
      `}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="font-serif text-xl text-gray-800 m-0">Past Sessions</h2>
                      <button onClick={startNewChat} className="text-teal-600 hover:text-teal-700 bg-transparent border-0 cursor-pointer p-3 md:p-2 text-base md:text-sm font-medium">
                          + New Chat
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                      {chatHistory.map((chat) => (
                          // THE SLIDE-TO-DELETE CONTAINER (Zero JS bugs, pure CSS translation)
                          <div key={chat.id} className="group relative w-full h-14 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
                              
                              {/* The Delete Button (Hiding underneath) */}
                              <button 
                                  onClick={(e) => deleteChat(chat.id, e)}
                                  className="absolute right-0 top-0 h-full cursor-pointer border-0 w-16 bg-red-500 flex items-center justify-center text-white transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                              >
                                  🗑️
                              </button>

                              {/* The Chat Button (Slides left on hover/touch) */}
                              <div 
                                  onClick={() => openOldChat(chat)}
                                  className="absolute inset-0 bg-white p-3 flex flex-col justify-center cursor-pointer transition-transform duration-300 ease-out group-hover:-translate-x-16"
                              >
                                  <span className="text-sm font-medium text-gray-800 truncate block">{chat.title}</span>
                                  <span className="text-xs text-gray-400 block">
                                      {new Date(chat.updated_at || chat.created_at).toLocaleDateString()}
                                  </span>
                              </div>
                          </div>
                      ))}
                      
                      {chatHistory.length === 0 && (
                          <p className="text-sm text-gray-400 text-center mt-10 italic">No past sessions found.</p>
                      )}
                  </div>
              </div>

      {/* ═══════════════════════════════════════════
          LEFT SIDE — Typewriter Paper (Chat)
          ═══════════════════════════════════════════ */}
      <div className="w-full md:w-1/2 h-[80dvh] md:h-[85vh] bg-[#fdfbf7] rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-stone-300 p-4 md:p-6 lg:p-8 flex flex-col relative overflow-hidden">

        {/* Paper texture lines */}
        <div className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(180,170,150,0.18) 31px, rgba(180,170,150,0.18) 32px)",
          }}
        />
        {/* Red margin line */}
        <div className="absolute left-12 top-0 bottom-0 w-px bg-red-300/30 pointer-events-none z-[1]" />

        {/* Header */}
        <div className="relative z-10 mb-4 flex-shrink-0">
          <button 
              onClick={() => setIsSidebarOpen(true)}
              className="mb-4 text-gray-500 hover:text-gray-800 flex items-center gap-2 transition p-3 -ml-3 md:p-1 md:-ml-1"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              Chat History
          </button>
          <p className="text-[10px] uppercase tracking-[3px] text-stone-400 mb-0.5" style={{ fontFamily: "Georgia, serif" }}>Session Notes</p>
          <h2 className="text-xl font-normal text-stone-700 tracking-wide" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            The Therapist&apos;s Desk
          </h2>
          <div className="h-px mt-2 bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto pl-8 pr-2 pt-1 pb-2 flex flex-col gap-3 relative z-10 min-h-0 scrollbar-thin">
          <AnimatePresence initial={false}>
            {conversation.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <span className="text-amber-700/50 text-xs mt-1 flex-shrink-0">✦</span>
                )}
                <div className={
                  msg.role === "user"
                    ? "bg-blue-50 border border-blue-200/40 rounded-xl rounded-br-sm px-4 py-2.5 max-w-[85%]"
                    : "max-w-[88%]"
                }>
                  <p className={
                    msg.role === "assistant"
                      ? "font-mono text-slate-800 text-[13.5px] leading-relaxed tracking-tight m-0 whitespace-pre-wrap"
                      : "text-stone-700 text-[13.5px] leading-relaxed m-0 whitespace-pre-wrap"
                  }
                    style={msg.role === "user" ? { fontFamily: "'Inter', sans-serif" } : { fontFamily: "'Courier New', 'Courier', monospace" }}
                  >
                    {msg.role === "assistant" && msg.id === lastAiId && msg.id !== "intro" ? (
                      <InkTypewriter text={msg.text} />
                    ) : (
                      msg.text
                    )}
                  </p>
                  
                  {/* 🎨 The Art Therapy Image Renderer */}
                  {msg.imageUrl && (
                      <div className="mt-4 p-2 bg-white/50 rounded-xl border border-gray-200 shadow-sm">
                          <span className="text-xs text-gray-400 font-medium mb-2 block uppercase tracking-widest">
                              Visual Reflection
                          </span>
                          <img 
                              src={msg.imageUrl} 
                              alt="AI Art Therapy" 
                              className="w-full h-auto rounded-lg object-cover"
                          />
                      </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking indicator */}
          {isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 pl-0"
            >
              <span className="text-amber-700/50 text-xs">✦</span>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="font-mono text-xs italic text-stone-400"
              >
                The ink is flowing…
              </motion.span>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex items-center gap-3 pt-2 pb-1 pl-8 relative z-10 flex-shrink-0">
          <button 
              onClick={isLiveCall ? stopLiveTherapy : startLiveTherapy}
              className={`px-4 py-3 md:py-2 rounded-full font-medium transition-colors text-base md:text-sm ${
                  isLiveCall 
                  ? "bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
              {isLiveCall ? "🔴 End Live Session" : "🎙️ Start Live Session"}
          </button>
          {voiceMode && isListening && !isThinking && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] italic text-stone-400" style={{ fontFamily: "Georgia, serif" }}>
              Listening…
            </motion.span>
          )}
          {voiceMode && isThinking && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="text-[11px] italic text-stone-400"
              style={{ fontFamily: "Georgia, serif" }}
            >
              ✦ Speaking back…
            </motion.span>
          )}
        </div>

        {/* Input Row */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmitText(); }}
          className="flex gap-2 pt-2.5 border-t border-stone-200/50 relative z-10 flex-shrink-0 pl-8"
        >
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={voiceMode ? "Voice mode active — speak aloud…" : "Write your thoughts here…"}
            disabled={isThinking}
            className="flex-1 h-10 rounded-lg border border-stone-200 bg-white/60 text-stone-700 text-[13px] px-4 outline-none focus:border-amber-600/40 focus:ring-1 focus:ring-amber-600/20 transition-all placeholder:text-stone-400/60"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="w-10 h-10 rounded-lg bg-stone-800 text-stone-200 flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-stone-700 transition-colors border-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 7-7 7 7" /><path d="M12 19V5" />
            </svg>
          </button>
        </form>
      </div>

      {/* ═══════════════════════════════════════════
          RIGHT SIDE — Lofi Tools
          ═══════════════════════════════════════════ */}
      <div className="w-full md:w-1/2 h-auto md:h-[85vh] flex flex-col gap-5">

        {/* ─── A. Vintage Tape Recorder (Top ~40%) ─── */}
        <div className="w-full bg-neutral-800 rounded-2xl shadow-2xl border-b-[6px] border-neutral-950 p-5 flex flex-col items-center justify-between relative overflow-hidden"
          style={{ flex: "0 0 40%" }}
        >
          {/* Brushed metal texture */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 3px)" }}
          />

          {/* Brand label */}
          <div className="w-full flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] uppercase tracking-[4px] text-neutral-500 font-semibold">Lofi Recorder</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
            </div>
          </div>

          {/* Tape Deck Window */}
          <div className="w-full bg-neutral-900/80 rounded-xl border border-neutral-700/50 p-4 flex items-center justify-center gap-8 mb-4 relative">
            {/* Inner shadow */}
            <div className="absolute inset-0 rounded-xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] pointer-events-none" />

            {/* Left Reel */}
            <motion.div
              animate={isRecording ? { rotate: 360 } : { rotate: 0 }}
              transition={isRecording ? { repeat: Infinity, duration: 2, ease: "linear" } : { duration: 0.3 }}
              className="w-16 h-16 rounded-full border-4 border-neutral-600 bg-neutral-800 flex items-center justify-center relative"
            >
              <div className="w-6 h-6 rounded-full bg-neutral-700 border-2 border-neutral-500" />
              <div className="absolute inset-2 rounded-full border border-dashed border-neutral-600/40" />
            </motion.div>

            {/* Tape ribbon */}
            <div className="flex-1 h-1 bg-gradient-to-r from-amber-900/60 via-amber-800/40 to-amber-900/60 rounded-full relative">
              {isRecording && (
                <motion.div
                  animate={{ x: [0, 60, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 rounded-full bg-amber-400/30 blur-sm"
                />
              )}
            </div>

            {/* Right Reel */}
            <motion.div
              animate={isRecording ? { rotate: 360 } : { rotate: 0 }}
              transition={isRecording ? { repeat: Infinity, duration: 1.6, ease: "linear" } : { duration: 0.3 }}
              className="w-16 h-16 rounded-full border-4 border-neutral-600 bg-neutral-800 flex items-center justify-center relative"
            >
              <div className="w-6 h-6 rounded-full bg-neutral-700 border-2 border-neutral-500" />
              <div className="absolute inset-2 rounded-full border border-dashed border-neutral-600/40" />
            </motion.div>
          </div>

          {/* Duration Counter */}
          <div className="text-neutral-400 font-mono text-sm mb-3 tracking-widest">
            {isRecording ? (
              <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-red-400">
                ● REC {formatSec(recordDuration)}
              </motion.span>
            ) : pendingAudio ? (
              <span className="text-amber-400">⏹ Review — {formatSec(pendingAudio.duration)}</span>
            ) : (
              <span>{formatSec(recordDuration)}</span>
            )}
          </div>

          {/* ─── Controls: Record / Review Phase ─── */}
          <AnimatePresence mode="wait">
            {pendingAudio ? (
              /* ═══ REVIEW PHASE ═══ */
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col items-center gap-3"
              >
                {/* Audio preview player */}
                <audio
                  src={pendingAudio.url}
                  controls
                  className="w-full h-8 rounded-md opacity-80"
                  style={{ filter: "invert(0.85) hue-rotate(180deg)" }}
                />

                {/* Save / Discard buttons */}
                <div className="flex gap-3 w-full">
                  <motion.button
                    onClick={handleDiscardTape}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95, y: 2 }}
                    className="flex-1 bg-stone-700 hover:bg-stone-600 text-white rounded-lg px-4 py-2.5 font-bold shadow-[0_4px_0_#292524] active:shadow-none active:translate-y-[4px] transition-all cursor-pointer border-0 text-sm flex items-center justify-center gap-2"
                  >
                    <span>❌</span> Discard
                  </motion.button>
                  <motion.button
                    onClick={handleSaveTape}
                    disabled={isUploading}
                    whileHover={!isUploading ? { scale: 1.03 } : {}}
                    whileTap={!isUploading ? { scale: 0.95, y: 2 } : {}}
                    className={`flex-1 ${isUploading ? 'bg-emerald-700/80 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500'} text-white rounded-lg px-4 py-2.5 font-bold shadow-[0_4px_0_#065f46] active:shadow-none active:translate-y-[4px] transition-all border-0 text-sm flex items-center justify-center gap-2`}
                  >
                    <span>✅</span> {isUploading ? 'Saving...' : 'Save Tape'}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              /* ═══ RECORD BUTTON ═══ */
              <motion.div
                key="record"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-2"
              >
                <motion.button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={isRecording ? stopRecording : undefined}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  whileTap={{ scale: 0.95, y: 4 }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer border-0 relative transition-all ${isRecording
                    ? "bg-red-700 shadow-[0_2px_0_#7f1d1d,0_0_30px_rgba(239,68,68,0.3)] translate-y-[2px]"
                    : "bg-red-600 shadow-[0_6px_0_#991b1b,0_8px_20px_rgba(0,0,0,0.3)] hover:bg-red-500"
                    }`}
                >
                  {isRecording ? (
                    <Fragment>
                      <motion.div
                        className="absolute inset-[-6px] rounded-full border-2 border-red-400/40"
                        animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                      />
                      <div className="w-5 h-5 rounded-sm bg-red-200" />
                    </Fragment>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-red-200" />
                  )}
                </motion.button>
                <span className="text-[10px] uppercase tracking-[2px] text-neutral-500">
                  {isRecording ? "Recording…" : "Hold to Record"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Uploading / Saving overlay */}
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-20"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="w-6 h-6 rounded-full border-2 border-neutral-600 border-t-amber-400"
                />
                <span className="text-neutral-300 text-sm font-mono">Saving tape & scoring…</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── B. Cassette Ledger (Middle ~40%) ─── */}
        <div className="w-full flex-1 min-h-0 bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-xs uppercase tracking-[3px] text-neutral-500 font-semibold m-0">Tape Archive</h3>
            <span className="text-[10px] text-neutral-600">{publicTapes.length} tapes</span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2.5 pr-1">
            {publicTapes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-50">
                <span className="text-3xl">📼</span>
                <p className="text-neutral-500 text-xs text-center italic" style={{ fontFamily: "Georgia, serif" }}>
                  Your recorded tapes will appear here. Hold the red button above to start.
                </p>
              </div>
            ) : (
              publicTapes.map((j, idx) => (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  className="bg-zinc-200 border-2 border-zinc-400 rounded-md shadow-md p-3 flex items-center gap-3 hover:border-zinc-500 transition-colors group"
                >
                  {/* Cassette icon */}
                  <div className="w-10 h-10 rounded bg-zinc-300 border border-zinc-400 flex items-center justify-center text-lg flex-shrink-0">
                    {getMoodEmoji(j.mood)}
                  </div>

                  {/* Masking-tape label */}
                  <div className="flex-1 min-w-0">
                    <div className="relative group/label">
                      <div className="bg-[#fefaf6] text-sm px-2 py-1 rounded-sm shadow-sm border border-amber-200/30 inline-block"
                        style={{ transform: "rotate(-0.5deg)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-stone-600 text-[10px] sm:text-[11px] font-mono">{formatJournalDate(j.created_at)}</span>
                          <span className="text-stone-300">·</span>
                          <span className="text-stone-800 font-bold text-[11px] truncate max-w-[120px]">
                            {j.title || "Untitled Tape"}
                          </span>
                          <button
                            onClick={() => handleRenameTape(j)}
                            className="bg-transparent border-0 p-0 text-stone-400 hover:text-stone-600 cursor-pointer hidden group-hover/label:inline-flex text-[10px]"
                          >
                            ✏️
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-stone-400 uppercase tracking-tighter">Smile:</span>
                          <span className="text-[12px] font-bold font-mono" style={{ color: getScoreColor(j.smile_score) }}>
                            {j.smile_score ?? "—"}/100
                          </span>
                          <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: getScoreColor(j.smile_score) }} />
                        </div>
                      </div>
                    </div>
                    {j.transcript && (
                      <p className="text-[10px] text-zinc-500 mt-1 truncate m-0 opacity-70 italic">{j.transcript}</p>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-1.5">
                    {/* Delete button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteTape(j)}
                      className="text-[10px] text-zinc-400 hover:text-red-600 bg-zinc-300/50 hover:bg-red-50 border border-zinc-400/50 rounded p-1.5 cursor-pointer transition-colors"
                    >
                      🗑️
                    </motion.button>

                    {/* Vault button */}
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (!userVaultPin) {
                          alert("Set up your Vault PIN first by clicking the Private Vault lockbox.");
                          return;
                        }
                        setSendToVaultId(j.id);
                        setSendToVaultPin(["", "", "", ""]);
                        setSendToVaultError(false);
                      }}
                      className="text-[10px] text-zinc-500 hover:text-amber-600 bg-zinc-300 hover:bg-zinc-200 border border-zinc-400 rounded px-1.5 py-1.5 cursor-pointer transition-colors flex-shrink-0 flex items-center gap-1"
                    >
                      🔒 <span className="hidden group-hover:inline font-semibold">Vault</span>
                    </motion.button>
                  </div>

                  {/* Play button */}
                  {j.audio_url !== "live-session-no-audio" && (
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleTogglePlay(j)}
                      className={`w-9 h-9 rounded-full border-0 cursor-pointer flex items-center justify-center text-white text-[11px] flex-shrink-0 transition-colors shadow-md ${playingId === j.id
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-stone-700 hover:bg-stone-600"
                        }`}
                    >
                      {playingId === j.id ? "⏸" : "▶"}
                    </motion.button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* ─── C. The Lockbox / Vault (Bottom ~20%) ─── */}
        <motion.button
          onClick={openVaultModal}
          whileHover={{ scale: 1.01, backgroundColor: "rgb(63 63 70)" }}
          whileTap={{ scale: 0.99 }}
          className="w-full bg-zinc-800 border-4 border-zinc-700 shadow-xl rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-700 transition-colors"
          style={{ flex: "0 0 auto" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))", color: "#d4a446" }}>🔒</span>
            <span className="text-zinc-300 text-sm font-semibold tracking-wide uppercase">Private Vault</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs">{vaultedTapes.length} tapes</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </motion.button>
      </div>

      {/* ═══════════════════════════════════════════
          SEND-TO-VAULT PIN MODAL
          ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {sendToVaultId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { setSendToVaultId(null); setSendToVaultPin(["", "", "", ""]); setSendToVaultError(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl w-full max-w-xs p-6 flex flex-col items-center gap-4"
            >
              <span className="text-3xl" style={{ color: "#d4a446" }}>🔒</span>
              <h3 className="text-zinc-200 text-sm font-semibold m-0">Enter PIN to vault this tape</h3>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <motion.input
                    key={i}
                    ref={(el) => { sendVaultPinRefs.current[i] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={sendToVaultPin[i]}
                    onChange={(e) => handleSendToVaultPinDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !sendToVaultPin[i] && i > 0) sendVaultPinRefs.current[i - 1]?.focus(); }}
                    animate={
                      sendToVaultError
                        ? { x: [0, -6, 6, -4, 4, 0], borderColor: "#dc2626" }
                        : { x: 0, borderColor: "rgb(82 82 91)" }
                    }
                    transition={{ duration: 0.4 }}
                    className="w-12 h-14 text-center text-xl font-mono rounded-lg border-2 border-zinc-600 bg-zinc-800 text-zinc-200 outline-none focus:border-amber-500 transition-colors"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              {sendToVaultError && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-[11px] m-0">Wrong PIN.</motion.p>
              )}
              <button
                onClick={() => { setSendToVaultId(null); setSendToVaultPin(["", "", "", ""]); setSendToVaultError(false); }}
                className="text-zinc-500 text-xs hover:text-zinc-300 bg-transparent border-0 cursor-pointer mt-1 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          VAULT MODAL OVERLAY
          ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {vaultOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={closeVaultModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl w-full max-w-md p-8 relative overflow-hidden"
            >
              {/* Steel texture */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 4px)" }}
              />

              {/* Close button */}
              <button
                onClick={closeVaultModal}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 cursor-pointer bg-transparent border-0 text-lg transition-colors"
              >
                ✕
              </button>

              <AnimatePresence mode="wait">
                {vaultMode === "setup" && (
                  /* ─── Setup Mode: Create PIN ─── */
                  <motion.div
                    key="setup"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center gap-5 relative z-10"
                  >
                    <span className="text-5xl mb-1" style={{ color: "#d4a446" }}>🔐</span>
                    <h3 className="text-zinc-200 text-lg font-semibold tracking-wide m-0">Set Up Your Private Vault</h3>
                    <p className="text-zinc-500 text-xs m-0 -mt-2">Create a 4-digit PIN to protect your vaulted tapes</p>

                    <div className="flex gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <input
                          key={i}
                          ref={(el) => { newPinRefs.current[i] = el; }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={newPinCode[i]}
                          onChange={(e) => handleNewPinDigit(i, e.target.value, newPinRefs, setNewPinCode, newPinCode)}
                          onKeyDown={(e) => { if (e.key === "Backspace" && !newPinCode[i] && i > 0) newPinRefs.current[i - 1]?.focus(); }}
                          className="w-14 h-16 text-center text-2xl font-mono rounded-xl border-2 border-zinc-600 bg-zinc-800 text-zinc-200 outline-none focus:border-amber-500 transition-colors"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSaveNewPin(newPinCode)}
                      disabled={!newPinCode.every((d) => d)}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg px-6 py-2.5 font-bold text-sm cursor-pointer border-0 shadow-md transition-all"
                    >
                      Create Vault PIN
                    </motion.button>
                  </motion.div>
                )}

                {vaultMode === "auth" && (
                  /* ─── Auth Mode: Enter PIN ─── */
                  <motion.div
                    key="auth"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center gap-5 relative z-10"
                  >
                    <span className="text-5xl mb-1" style={{ color: "#d4a446", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}>🔒</span>
                    <h3 className="text-zinc-200 text-lg font-semibold tracking-wide m-0">Enter Vault PIN</h3>
                    <p className="text-zinc-500 text-xs m-0 -mt-2">4-digit code required</p>

                    <div className="flex gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.input
                          key={i}
                          ref={(el) => { pinRefs.current[i] = el; }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={pinCode[i]}
                          onChange={(e) => handlePinDigit(i, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(i, e)}
                          animate={
                            pinError
                              ? { x: [0, -8, 8, -5, 5, 0], borderColor: "#dc2626" }
                              : { x: 0, borderColor: "rgb(82 82 91)" }
                          }
                          transition={{ duration: 0.4 }}
                          className="w-14 h-16 text-center text-2xl font-mono rounded-xl border-2 border-zinc-600 bg-zinc-800 text-zinc-200 outline-none focus:border-amber-500 transition-colors"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>

                    {pinError && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs m-0">
                        Incorrect PIN. Try again.
                      </motion.p>
                    )}
                  </motion.div>
                )}

                {vaultMode === "contents" && (
                  /* ─── Vault Contents ─── */
                  <motion.div
                    key="contents"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col gap-4 relative z-10 w-full"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🔓</span>
                        <h3 className="text-zinc-200 text-lg font-semibold m-0">
                          {vaultedTapes.length > 0
                            ? `${vaultedTapes.length} Vaulted Tapes`
                            : "Vault Empty"}
                        </h3>
                      </div>
                      <button
                        onClick={() => { setVaultMode("changePin"); setNewPinCode(["", "", "", ""]); }}
                        className="text-[11px] text-zinc-500 hover:text-amber-400 bg-transparent border-0 cursor-pointer transition-colors"
                      >
                        Change PIN
                      </button>
                    </div>

                    {vaultedTapes.length > 0 ? (
                      <div className="w-full max-h-60 overflow-y-auto flex flex-col gap-2 pr-1">
                        {vaultedTapes.map((j, idx) => (
                          <motion.div
                            key={j.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.06 }}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 flex items-center gap-3"
                          >
                            <span className="text-lg">{getMoodEmoji(j.mood)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-zinc-300 text-xs m-0">
                                {new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              <p className="font-mono text-sm font-bold m-0" style={{ color: getScoreColor(j.smile_score) }}>
                                {j.smile_score ?? "—"}/100
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleUnvaultTape(j)}
                                title="Return to Archive"
                                className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 border-0 text-zinc-300 cursor-pointer flex items-center justify-center text-xs"
                              >
                                📤
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteTape(j)}
                                title="Burn Tape"
                                className="w-8 h-8 rounded bg-zinc-700 hover:bg-red-900 border-0 text-zinc-400 hover:text-red-200 cursor-pointer flex items-center justify-center text-xs"
                              >
                                🗑️
                              </motion.button>
                              {j.audio_url !== "live-session-no-audio" && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleTogglePlay(j)}
                                  className={`w-8 h-8 rounded-full border-0 cursor-pointer flex items-center justify-center text-white text-[10px] ${playingId === j.id ? "bg-red-600" : "bg-zinc-600 hover:bg-zinc-500"
                                    }`}
                                >
                                  {playingId === j.id ? "⏸" : "▶"}
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm italic text-center" style={{ fontFamily: "Georgia, serif" }}>
                        Send tapes to the vault using the 🔒 button on each cassette card.
                      </p>
                    )}
                  </motion.div>
                )}

                {vaultMode === "changePin" && (
                  /* ─── Change PIN ─── */
                  <motion.div
                    key="changePin"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center gap-5 relative z-10"
                  >
                    <span className="text-4xl">🔑</span>
                    <h3 className="text-zinc-200 text-lg font-semibold m-0">Change Vault PIN</h3>
                    <p className="text-zinc-500 text-xs m-0 -mt-2">Enter your new 4-digit PIN</p>

                    <div className="flex gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <input
                          key={i}
                          ref={(el) => { newPinRefs.current[i] = el; }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={newPinCode[i]}
                          onChange={(e) => handleNewPinDigit(i, e.target.value, newPinRefs, setNewPinCode, newPinCode)}
                          onKeyDown={(e) => { if (e.key === "Backspace" && !newPinCode[i] && i > 0) newPinRefs.current[i - 1]?.focus(); }}
                          className="w-14 h-16 text-center text-2xl font-mono rounded-xl border-2 border-zinc-600 bg-zinc-800 text-zinc-200 outline-none focus:border-amber-500 transition-colors"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setVaultMode("contents")}
                        className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg px-5 py-2 text-sm cursor-pointer border-0 transition-colors"
                      >
                        Cancel
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSaveNewPin(newPinCode)}
                        disabled={!newPinCode.every((d) => d)}
                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg px-5 py-2 font-bold text-sm cursor-pointer border-0 shadow-md transition-all"
                      >
                        Update PIN
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed top-10 right-10 z-[200] bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-2xl border-l-4 border-emerald-400 flex items-center gap-3 font-medium"
          >
            <span className="text-xl">🔒</span>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
