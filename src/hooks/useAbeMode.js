import { useCallback, useState } from 'react';

export const useAbeMode = () => {
  // Hidden Abe Mode unlock state (persisted)
  const [abeModeUnlocked, setAbeModeUnlocked] = useState(() => {
    try {
      return localStorage.getItem('abe_mode_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Celebration modal visibility
  const [showAbeUnlockCelebration, setShowAbeUnlockCelebration] = useState(false);

  // Unlock Abe Mode and show celebration (called from search or other triggers)
  const unlockAbeMode = useCallback(() => {
    console.log('unlockAbeMode called. unlocked:', abeModeUnlocked);
    // If already unlocked, do nothing (or maybe we want to re-celebrate? No, logic says check !unlocked)
    // Actually original logic allowed re-triggering if not checked?
    // Original: if (!abeModeUnlocked) { ... } else { console.log('already') }
    // But abeModeUnlocked is state.

    // We should check the current state.
    // However, since we are inside a hook, we rely on the state variable `abeModeUnlocked`.

    if (!abeModeUnlocked) {
      console.log('Unlocking Abe Mode...');
      setAbeModeUnlocked(true);
      localStorage.setItem('abe_mode_unlocked', 'true');
      setShowAbeUnlockCelebration(true);

      // Play unlock sound & Fanfare
      try {
        console.log('Attempting to play audio...');
        const audioPath = `${import.meta.env.BASE_URL}sounds/abe_unlock.wav`;
        const fanfarePath = `${import.meta.env.BASE_URL}sounds/fanfare.mp3`;

        const audio = new Audio(audioPath);
        const fanfare = new Audio(fanfarePath);

        audio.volume = 0.5;
        fanfare.volume = 0.4; // Slightly lower volume for fanfare

        fanfare
          .play()
          .then(() => console.log('Fanfare playing'))
          .catch((e) => console.error('Failed to play fanfare:', e));

        setTimeout(() => {
          audio
            .play()
            .then(() => console.log('Unlock voice playing'))
            .catch((e) => console.error('Failed to play unlock voice:', e));
        }, 1500);
      } catch (e) {
        console.error('Audio playback error:', e);
      }
    } else {
      console.log('Abe Mode already unlocked.');
    }
  }, [abeModeUnlocked]);

  // Close celebration modal
  const closeAbeUnlockCelebration = useCallback(() => {
    setShowAbeUnlockCelebration(false);
  }, []);

  return {
    abeModeUnlocked,
    showAbeUnlockCelebration,
    unlockAbeMode,
    closeAbeUnlockCelebration,
  };
};
