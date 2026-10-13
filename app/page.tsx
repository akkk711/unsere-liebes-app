'use client';
import { differenceInDays, differenceInSeconds } from 'date-fns';
import { useState, useEffect } from 'react';
import { FaHome, FaPalette, FaStar, FaImage } from 'react-icons/fa';

export default function Home() {
  const anniversary = new Date('2026-08-20T00:00:00');
  const [daysTogether, setDaysTogether] = useState(0);

  useEffect(() => {
    // Berechnung der Tage seit/bis zum Jahrestag
    setDaysTogether(Math.abs(differenceInDays(new Date(), anniversary)));
  }, []);

  return (
    <div className="min-h-screen bg-[#F0EEF5] pb-24 font-sans flex flex-col items-center">
      
      {/* Mood Tracker */}
      <div className="w-full max-w-md p-4">
        <p className="text-center text-xs text-gray-500 font-bold mb-2 tracking-wider">DEINE STIMMUNG HEUTE</p>
        <div className="bg-white rounded-full p-2 flex justify-around items-center shadow-sm">
          {/* Hier kommen die Buttons für die Emojis rein */}
          <button className="text-2xl hover:scale-110 transition">😊</button>
          <button className="text-2xl hover:scale-110 transition">🥰</button>
          <button className="text-2xl hover:scale-110 transition">🥱</button>
          <div className="bg-purple-200 rounded-full p-2 shadow-inner"><button className="text-2xl">😢</button></div>
        </div>
      </div>

      {/* Unsere Reise Karte */}
      <div className="w-full max-w-md p-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center">
          <h2 className="text-lg text-indigo-900 font-bold mb-4">Unsere Reise</h2>
          <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Wir lieben uns seit</p>
          <h1 className="text-6xl text-indigo-600 font-black my-2">{daysTogether}</h1>
          <p className="text-sm text-gray-500 font-bold mb-1">TAGEN</p>
          <p className="text-sm text-gray-800 mb-6">18 Std. 41 Min. 0 Sek.</p>
          
          <div className="w-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl p-4 text-center text-white shadow-md">
            <p className="text-sm font-semibold">Nächster Jahrestag in</p>
            <p className="text-2xl font-bold mt-1">311 Tagen ❤️</p>
          </div>
        </div>
      </div>

      {/* Süßer Gedanke Karte */}
      <div className="w-full max-w-md p-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm relative">
          <h2 className="text-lg text-indigo-900 font-bold mb-4 text-center">Süßer Gedanke</h2>
          <span className="text-4xl text-purple-200 absolute left-6 top-12">"</span>
          <p className="text-center text-gray-600 italic mt-4 z-10 relative">Du machst mein Leben komplett.</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-4 left-0 w-full flex justify-center px-4">
        <div className="bg-white rounded-3xl shadow-lg w-full max-w-md flex justify-around items-center p-2 relative">
          <button className="bg-purple-200 text-indigo-800 rounded-2xl py-2 px-4 flex flex-col items-center w-20">
            <FaHome className="text-xl mb-1 text-orange-500" />
            <span className="text-xs font-bold">Home</span>
          </button>
          <button className="text-gray-400 hover:text-indigo-600 rounded-2xl py-2 px-4 flex flex-col items-center w-20 transition">
            <FaPalette className="text-xl mb-1 text-pink-400" />
            <span className="text-xs font-bold">Malen</span>
          </button>
          <button className="text-gray-400 hover:text-indigo-600 rounded-2xl py-2 px-4 flex flex-col items-center w-20 transition">
            <FaStar className="text-xl mb-1 text-yellow-400" />
            <span className="text-xs font-bold">Ziele</span>
          </button>
          <button className="text-gray-400 hover:text-indigo-600 rounded-2xl py-2 px-4 flex flex-col items-center w-20 transition">
            <FaImage className="text-xl mb-1 text-green-400" />
            <span className="text-xs font-bold">Galerie</span>
          </button>
        </div>
      </div>

    </div>
  );
}