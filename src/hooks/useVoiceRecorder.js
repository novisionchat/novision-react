// src/hooks/useVoiceRecorder.js
import { useState, useRef, useCallback } from 'react';

export function useVoiceRecorder(onRecordingComplete) {
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // Tüm kaynakları (mikrofon, recorder) temizleyen merkezi fonksiyon.
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null; // onstop event'ini kaldırarak istenmeyen dosya gönderimini engelle
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Kaydı durdurur VE onRecordingComplete'i tetikler (gönderme işlemi).
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // Bu, onstop olayını tetikleyecek
      // Cleanup, onstop içinde yapılacak.
    } else {
      cleanup();
    }
    setIsRecording(false);
  }, [cleanup]);

  // Kaydı durdurur ama dosyayı göndermez (iptal işlemi).
  const cancelRecording = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Kaydı başlatan ana fonksiyon.
  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      let audioChunks = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
        
        if (onRecordingComplete) {
          onRecordingComplete(audioFile);
        }
        
        // Gönderme işleminden sonra kaynakları temizle.
        cleanup();
      };

      recorder.start();
      setIsRecording(true);

    } catch (error) {
      console.error('Mikrofon erişim hatası:', error);
      alert('Sesli mesaj gönderebilmek için mikrofon erişim izni vermeniz gerekmektedir.');
      cleanup();
    }
  }, [onRecordingComplete, cleanup]);

  return { isRecording, startRecording, stopRecording, cancelRecording };
}