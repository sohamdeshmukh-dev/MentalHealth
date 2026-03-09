import React from 'react';

interface Props {
    onClick: () => void;
}

export default function ProfileButton({ onClick }: Props) {
    return (
        <button
            onClick={onClick}
            className="pointer-events-auto rounded-full bg-slate-800/80 p-2.5 text-slate-300 backdrop-blur-md hover:bg-slate-700/80 hover:text-white shadow-lg border border-slate-700/50 transition duration-200"
            title="User Profile"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
            </svg>
        </button>
    );
}
