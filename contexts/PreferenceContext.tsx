
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface PreferenceContextType {
  preferredGenres: string[];
  preferredChannels: string[];
  preferredDurations: string[]; // 'short', 'medium', 'long'
  preferredFreshness: string; // 'new', 'popular', 'balanced'
  discoveryMode: string; // 'subscribed', 'discovery', 'balanced'
  ngKeywords: string[];
  
  addPreferredGenre: (genre: string) => void;
  removePreferredGenre: (genre: string) => void;
  addPreferredChannel: (channel: string) => void;
  removePreferredChannel: (channel: string) => void;
  
  togglePreferredDuration: (duration: string) => void;
  setPreferredFreshness: (freshness: string) => void;
  setDiscoveryMode: (mode: string) => void;
  
  addNgKeyword: (keyword: string) => void;
  removeNgKeyword: (keyword: string) => void;
}

const PreferenceContext = createContext<PreferenceContextType | undefined>(undefined);

export const PreferenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Existing Preferences
  const [preferredGenres, setPreferredGenres] = useState<string[]>(() => {
    try {
      const item = window.localStorage.getItem('preferredGenres');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      return [];
    }
  });

  const [preferredChannels, setPreferredChannels] = useState<string[]>(() => {
    try {
      const item = window.localStorage.getItem('preferredChannels');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      return [];
    }
  });

  // New Preferences (3 Questions)
  const [preferredDurations, setPreferredDurations] = useState<string[]>(() => {
    try {
      const item = window.localStorage.getItem('preferredDurations');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      return [];
    }
  });

  const [preferredFreshness, setPreferredFreshness] = useState<string>(() => {
    return window.localStorage.getItem('preferredFreshness') || 'balanced';
  });

  const [discoveryMode, setDiscoveryMode] = useState<string>(() => {
    return window.localStorage.getItem('discoveryMode') || 'balanced';
  });

  // NG Keywords
  const [ngKeywords, setNgKeywords] = useState<string[]>(() => {
    try {
      const item = window.localStorage.getItem('ngKeywords');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      return [];
    }
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('preferredGenres', JSON.stringify(preferredGenres));
  }, [preferredGenres]);

  useEffect(() => {
    localStorage.setItem('preferredChannels', JSON.stringify(preferredChannels));
  }, [preferredChannels]);

  useEffect(() => {
    localStorage.setItem('preferredDurations', JSON.stringify(preferredDurations));
  }, [preferredDurations]);

  useEffect(() => {
    localStorage.setItem('preferredFreshness', preferredFreshness);
  }, [preferredFreshness]);

  useEffect(() => {
    localStorage.setItem('discoveryMode', discoveryMode);
  }, [discoveryMode]);

  useEffect(() => {
    localStorage.setItem('ngKeywords', JSON.stringify(ngKeywords));
  }, [ngKeywords]);


  // Handlers
  const addPreferredGenre = (genre: string) => {
    if (!preferredGenres.includes(genre)) {
      setPreferredGenres(prev => [...prev, genre]);
    }
  };

  const removePreferredGenre = (genre: string) => {
    setPreferredGenres(prev => prev.filter(g => g !== genre));
  };

  const addPreferredChannel = (channel: string) => {
    if (!preferredChannels.includes(channel)) {
      setPreferredChannels(prev => [...prev, channel]);
    }
  };

  const removePreferredChannel = (channel: string) => {
    setPreferredChannels(prev => prev.filter(c => c !== channel));
  };

  const togglePreferredDuration = (duration: string) => {
    setPreferredDurations(prev => {
      if (prev.includes(duration)) {
        return prev.filter(d => d !== duration);
      } else {
        return [...prev, duration];
      }
    });
  };

  const addNgKeyword = (keyword: string) => {
    if (!ngKeywords.includes(keyword)) {
      setNgKeywords(prev => [...prev, keyword]);
    }
  };

  const removeNgKeyword = (keyword: string) => {
    setNgKeywords(prev => prev.filter(k => k !== keyword));
  };

  return (
    <PreferenceContext.Provider value={{
      preferredGenres,
      preferredChannels,
      preferredDurations,
      preferredFreshness,
      discoveryMode,
      ngKeywords,
      addPreferredGenre,
      removePreferredGenre,
      addPreferredChannel,
      removePreferredChannel,
      togglePreferredDuration,
      setPreferredFreshness,
      setDiscoveryMode,
      addNgKeyword,
      removeNgKeyword
    }}>
      {children}
    </PreferenceContext.Provider>
  );
};

export const usePreference = (): PreferenceContextType => {
  const context = useContext(PreferenceContext);
  if (context === undefined) {
    throw new Error('usePreference must be used within a PreferenceProvider');
  }
  return context;
};
