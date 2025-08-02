import React from 'react';

/**
 * DJPanel provides simple sound effect controls. When the user presses a
 * button, a preloaded audio file plays through the browser. Audio files
 * should be placed in `public/sounds`.
 */
export default function DJPanel() {
  const playSound = (filename, extension = 'wav') => {
    const audio = new Audio(`/sounds/${filename}.${extension}`);
    audio.play();
  };

  return (
    <div className="border rounded shadow p-4">
      <h4 className="text-xl font-semibold mb-2">DJ Panel</h4>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => playSound('goal_horn', 'mp3')}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Goal Horn
        </button>
        <button
          onClick={() => playSound('whistle')}
          className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
        >
          Whistle
        </button>
        <button
          onClick={() => playSound('dj_air_horn', 'mp3')}
          className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600"
        >
          Air Horn
        </button>
        <button
          onClick={() => playSound('buzzer')}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Period Buzzer
        </button>
      </div>
    </div>
  );
}