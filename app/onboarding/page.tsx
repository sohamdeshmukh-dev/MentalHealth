'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust path to your setup
import { useRouter } from 'next/navigation';

export default function StudentOnboarding() {
    const router = useRouter();
    const [isStudent, setIsStudent] = useState<boolean | null>(null);
    const [university, setUniversity] = useState('');
    const [major, setMajor] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Freshman');

    // A small sample list (You can expand this or fetch from an API)
    const citiesColleges = [
        "University of Pennsylvania", "Drexel University", "Temple University", 
        "UCLA", "USC", "NYU", "Columbia University"
    ];

    const handleSave = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Save to Supabase backend
        const { error } = await supabase
            .from('profiles')
            .update({
                is_student: isStudent,
                university_name: isStudent ? university : null,
                major: isStudent ? major : null,
                grade_level: isStudent ? gradeLevel : null,
            })
            .eq('id', user.id);

        if (!error) {
            router.push('/'); // Send them to the main app! (Updated to / since dashboard seems to be main page)
        } else {
            console.error('Failed to save onboarding data', error);
            // Fallback routing even if error, to prevent getting stuck
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 page-enter">
            <h1 className="text-3xl font-bold mb-8">Are you currently a student?</h1>
            
            <div className="flex gap-4 mb-8">
                <button 
                    onClick={() => setIsStudent(true)}
                    className={`px-8 py-3 rounded-xl border transition-all ${isStudent === true ? 'bg-teal-600 border-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.3)]' : 'border-gray-600 hover:border-teal-500/50 hover:bg-white/5'}`}
                >
                    Yes, I am
                </button>
                <button 
                    onClick={() => { setIsStudent(false); handleSave(); }}
                    className={`px-8 py-3 rounded-xl border transition-all ${isStudent === false ? 'bg-slate-700 border-slate-500' : 'border-gray-600 hover:border-slate-500/50 hover:bg-white/5'}`}
                >
                    No, I'm not
                </button>
            </div>

            {isStudent && (
                <div className="flex flex-col gap-4 w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
                    <select 
                        className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        onChange={(e) => setUniversity(e.target.value)}
                        value={university}
                    >
                        <option value="">Select your College...</option>
                        {citiesColleges.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <input 
                        type="text" 
                        placeholder="What is your Major? (e.g. Computer Science)"
                        className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        onChange={(e) => setMajor(e.target.value)}
                        value={major}
                    />

                    <select 
                        className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        onChange={(e) => setGradeLevel(e.target.value)}
                        value={gradeLevel}
                    >
                        <option>Freshman</option>
                        <option>Sophomore</option>
                        <option>Junior</option>
                        <option>Senior</option>
                        <option>Graduate Student</option>
                    </select>

                    <button 
                        onClick={handleSave} 
                        disabled={!university || !major}
                        className="mt-4 bg-teal-500 text-black font-bold py-3 rounded-lg hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save & Continue
                    </button>
                </div>
            )}
        </div>
    );
}
