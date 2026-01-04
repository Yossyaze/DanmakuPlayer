import { useState } from 'react';

export const useUrlInputHandler = (handleVideoUrlSubmitCore) => {
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);

  const handleVideoUrlSubmit = (e) => {
    // Assuming handleVideoUrlSubmitCore expects (e, url)
    handleVideoUrlSubmitCore(e, videoUrlInput);
    if (videoUrlInput) {
      setShowUrlModal(false);
    }
  };

  return {
    videoUrlInput,
    setVideoUrlInput,
    showUrlModal,
    setShowUrlModal,
    handleVideoUrlSubmit,
  };
};
