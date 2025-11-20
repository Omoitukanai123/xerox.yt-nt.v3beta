
import React, { useState } from 'react';
import { CloseIcon } from './icons/Icons';
import { usePreference } from '../contexts/PreferenceContext';

interface PreferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PreferenceModal: React.FC<PreferenceModalProps> = ({ isOpen, onClose }) => {
    const { 
        preferredGenres, preferredChannels, 
        preferredDurations, preferredFreshness, discoveryMode, ngKeywords,
        addPreferredGenre, removePreferredGenre, 
        addPreferredChannel, removePreferredChannel,
        togglePreferredDuration, setPreferredFreshness, setDiscoveryMode,
        addNgKeyword, removeNgKeyword
    } = usePreference();

    const [genreInput, setGenreInput] = useState('');
    const [channelInput, setChannelInput] = useState('');
    const [ngInput, setNgInput] = useState('');

    if (!isOpen) return null;

    const handleAddGenre = (e: React.FormEvent) => {
        e.preventDefault();
        if (genreInput.trim()) {
            addPreferredGenre(genreInput.trim());
            setGenreInput('');
        }
    };

    const handleAddChannel = (e: React.FormEvent) => {
        e.preventDefault();
        if (channelInput.trim()) {
            addPreferredChannel(channelInput.trim());
            setChannelInput('');
        }
    };

    const handleAddNg = (e: React.FormEvent) => {
        e.preventDefault();
        if (ngInput.trim()) {
            addNgKeyword(ngInput.trim());
            setNgInput('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
            <div className="bg-yt-white dark:bg-yt-light-black w-full max-w-2xl max-h-[90vh] rounded-xl shadow-xl flex flex-col m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-yt-spec-light-20 dark:border-yt-spec-20">
                    <h2 className="text-xl font-bold text-black dark:text-white">おすすめ設定</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10">
                        <CloseIcon />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8 flex-1">
                    {/* 1. Genres */}
                    <section>
                        <h3 className="text-sm font-semibold text-yt-light-gray mb-2 uppercase tracking-wider">好きなジャンル・キーワード</h3>
                        <form onSubmit={handleAddGenre} className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={genreInput}
                                onChange={(e) => setGenreInput(e.target.value)}
                                placeholder="例: ゲーム, 料理, 猫"
                                className="flex-1 bg-yt-light dark:bg-yt-black border border-yt-spec-light-20 dark:border-yt-spec-20 rounded-lg px-3 py-2 text-black dark:text-white focus:border-yt-blue outline-none"
                            />
                            <button type="submit" className="bg-yt-blue text-white px-4 py-2 rounded-lg font-medium hover:opacity-90">追加</button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                            {preferredGenres.map((genre, idx) => (
                                <span key={idx} className="inline-flex items-center bg-yt-spec-light-10 dark:bg-yt-spec-10 px-3 py-1 rounded-full text-sm text-black dark:text-white">
                                    {genre}
                                    <button onClick={() => removePreferredGenre(genre)} className="ml-2 text-yt-light-gray hover:text-yt-red">
                                        <CloseIcon />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* 2. Channels */}
                    <section>
                        <h3 className="text-sm font-semibold text-yt-light-gray mb-2 uppercase tracking-wider">よく見るチャンネル名</h3>
                        <form onSubmit={handleAddChannel} className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={channelInput}
                                onChange={(e) => setChannelInput(e.target.value)}
                                placeholder="例: HIKAKIN"
                                className="flex-1 bg-yt-light dark:bg-yt-black border border-yt-spec-light-20 dark:border-yt-spec-20 rounded-lg px-3 py-2 text-black dark:text-white focus:border-yt-blue outline-none"
                            />
                            <button type="submit" className="bg-yt-blue text-white px-4 py-2 rounded-lg font-medium hover:opacity-90">追加</button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                            {preferredChannels.map((channel, idx) => (
                                <span key={idx} className="inline-flex items-center bg-yt-spec-light-10 dark:bg-yt-spec-10 px-3 py-1 rounded-full text-sm text-black dark:text-white">
                                    {channel}
                                    <button onClick={() => removePreferredChannel(channel)} className="ml-2 text-yt-light-gray hover:text-yt-red">
                                        <CloseIcon />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Question 1: Duration */}
                        <section>
                            <h3 className="text-sm font-semibold text-yt-light-gray mb-3 uppercase tracking-wider">動画の長さ</h3>
                            <div className="flex flex-col gap-2">
                                {['short', 'medium', 'long'].map((d) => {
                                    const label = d === 'short' ? '短い (< 4分)' : d === 'medium' ? '普通 (4-20分)' : '長い (> 20分)';
                                    const isSelected = preferredDurations.includes(d);
                                    return (
                                        <button
                                            key={d}
                                            onClick={() => togglePreferredDuration(d)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium text-left border transition-colors ${
                                                isSelected 
                                                ? 'bg-yt-blue text-white border-yt-blue' 
                                                : 'bg-transparent text-black dark:text-white border-yt-spec-light-20 dark:border-yt-spec-20 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                                <p className="text-xs text-yt-light-gray mt-1">※ 選択しない場合は全て表示</p>
                            </div>
                        </section>

                        {/* Question 2: Freshness */}
                        <section>
                            <h3 className="text-sm font-semibold text-yt-light-gray mb-3 uppercase tracking-wider">動画の鮮度</h3>
                            <div className="flex flex-col gap-2">
                                {[
                                    { id: 'new', label: '新しい動画重視' },
                                    { id: 'popular', label: '人気・定番重視' },
                                    { id: 'balanced', label: 'バランスよく' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => setPreferredFreshness(f.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium text-left border transition-colors ${
                                            preferredFreshness === f.id 
                                            ? 'bg-yt-blue text-white border-yt-blue' 
                                            : 'bg-transparent text-black dark:text-white border-yt-spec-light-20 dark:border-yt-spec-20 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Question 3: Discovery Mode */}
                        <section>
                            <h3 className="text-sm font-semibold text-yt-light-gray mb-3 uppercase tracking-wider">発見のバランス</h3>
                            <div className="flex flex-col gap-2">
                                {[
                                    { id: 'subscribed', label: '登録Ch中心' },
                                    { id: 'discovery', label: '新規開拓中心' },
                                    { id: 'balanced', label: 'バランスよく' }
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setDiscoveryMode(m.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium text-left border transition-colors ${
                                            discoveryMode === m.id 
                                            ? 'bg-yt-blue text-white border-yt-blue' 
                                            : 'bg-transparent text-black dark:text-white border-yt-spec-light-20 dark:border-yt-spec-20 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10'
                                        }`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* NG Settings */}
                    <section className="pt-4 border-t border-yt-spec-light-20 dark:border-yt-spec-20">
                        <h3 className="text-sm font-semibold text-red-500 mb-2 uppercase tracking-wider">NGワード・ジャンル (除外)</h3>
                        <form onSubmit={handleAddNg} className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={ngInput}
                                onChange={(e) => setNgInput(e.target.value)}
                                placeholder="除外したい単語 (例: ホラー, 虫)"
                                className="flex-1 bg-yt-light dark:bg-yt-black border border-yt-spec-light-20 dark:border-yt-spec-20 rounded-lg px-3 py-2 text-black dark:text-white focus:border-red-500 outline-none"
                            />
                            <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90">追加</button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                            {ngKeywords.map((keyword, idx) => (
                                <span key={idx} className="inline-flex items-center bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-1 rounded-full text-sm text-red-800 dark:text-red-200">
                                    {keyword}
                                    <button onClick={() => removeNgKeyword(keyword)} className="ml-2 hover:text-red-900 dark:hover:text-white">
                                        <CloseIcon />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </section>

                    <div className="bg-yt-spec-light-10 dark:bg-yt-spec-10 p-4 rounded-lg text-sm text-yt-light-gray">
                        <p>これらの設定に基づいて、おすすめ動画の表示アルゴリズムがリアルタイムに調整されます。NGワードに含まれる単語がタイトルやチャンネル名にある動画は表示されなくなります。</p>
                    </div>
                </div>
                
                <div className="p-6 border-t border-yt-spec-light-20 dark:border-yt-spec-20 flex justify-end bg-yt-white dark:bg-yt-light-black rounded-b-xl">
                    <button onClick={onClose} className="bg-yt-blue text-white font-semibold px-6 py-2.5 hover:bg-yt-blue/90 rounded-full shadow-md transition-all active:scale-95">
                        設定を完了する
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreferenceModal;
