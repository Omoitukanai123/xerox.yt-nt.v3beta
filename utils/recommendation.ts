
import type { Video, Channel } from '../types';
import { searchVideos, getChannelVideos } from './api';

// 文字列からハッシュタグや重要そうなキーワードを抽出する
const extractKeywords = (text: string): string[] => {
    if (!text) return [];
    const hashtags = text.match(/#[^\s#]+/g) || [];
    const brackets = text.match(/[\[【](.+?)[\]】]/g) || [];
    const rawText = text.replace(/[\[【].+?[\]】]/g, '').replace(/#[^\s#]+/g, '');
    const words = rawText.replace(/[!-/:-@[-`{-~]/g, ' ').split(/\s+/);
    const cleanHashtags = hashtags.map(t => t.trim());
    const cleanBrackets = brackets.map(t => t.replace(/[\[【\]】]/g, '').trim());
    const cleanWords = words.filter(w => w.length > 1 && !/^(http|www|com|jp)/.test(w));
    return [...cleanHashtags, ...cleanBrackets, ...cleanWords];
};

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const parseDurationToSeconds = (isoDuration: string): number => {
    if (!isoDuration) return 0;
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = isoDuration.match(regex);
    if (!matches) return 0;
    const h = parseInt(matches[1] || '0', 10);
    const m = parseInt(matches[2] || '0', 10);
    const s = parseInt(matches[3] || '0', 10);
    return h * 3600 + m * 60 + s;
};

// 採点付き動画型
interface ScoredVideo extends Video {
    score: number;
    debugReason?: string[];
}

interface RecommendationSource {
    searchHistory: string[];
    watchHistory: Video[];
    subscribedChannels: Channel[];
    preferredGenres: string[];
    preferredChannels: string[];
    preferredDurations?: string[];
    preferredFreshness?: string;
    discoveryMode?: string;
    ngKeywords?: string[];
    // Preferences
    prefDepth?: string;
    prefVocal?: string;
    prefEra?: string;
    prefRegion?: string;
    prefLive?: string;
    prefInfoEnt?: string;
    prefPacing?: string;
    prefVisual?: string;
    prefCommunity?: string;
    page: number;
}

// --- SCORING ENGINE ---
// 各動画に対して、ユーザーの好みに基づいて厳密に点数を付けるシステム
const calculateScore = (
    video: Video, 
    source: RecommendationSource
): { score: number, reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];
    const lowerTitle = video.title.toLowerCase();
    const lowerDesc = (video.descriptionSnippet || '').toLowerCase();
    const lowerChannel = video.channelName.toLowerCase();
    const fullText = `${lowerTitle} ${lowerDesc} ${lowerChannel}`;
    
    // 1. NG Filter (Instant disqualification)
    if (source.ngKeywords) {
        for (const ng of source.ngKeywords) {
            if (fullText.includes(ng.toLowerCase())) {
                return { score: -10000, reasons: [`NG Keyword: ${ng}`] };
            }
        }
    }

    // 2. Duration Scoring (CRITICAL RULE: Strict Filtering)
    // ユーザーが長さを指定している場合、一致しないものを強力に排除する
    if (source.preferredDurations && source.preferredDurations.length > 0) {
        const sec = parseDurationToSeconds(video.isoDuration);
        let durationMatch = false;
        
        if (source.preferredDurations.includes('short') && sec > 0 && sec < 240) durationMatch = true;
        if (source.preferredDurations.includes('medium') && sec >= 240 && sec <= 1200) durationMatch = true;
        if (source.preferredDurations.includes('long') && sec > 1200) durationMatch = true;

        if (durationMatch) {
            score += 200; // Huge Bonus for matching preferred duration
            reasons.push('Duration Match (Priority)');
        } else if (sec > 0) {
            // Huge Penalty for mismatching duration to act as a filter
            score -= 500; 
            reasons.push('Duration Mismatch (Penalty)');
        }
    }

    // 3. Preferred Channels (+50)
    if (source.preferredChannels.some(c => lowerChannel.includes(c.toLowerCase()))) {
        score += 50;
        reasons.push('Preferred Channel');
    }

    // 4. Subscribed Channels (+30)
    if (source.subscribedChannels.some(c => c.id === video.channelId || c.name.toLowerCase() === lowerChannel)) {
        score += 30;
        reasons.push('Subscribed Channel');
    }

    // 5. Keyword Matching (+40 per match - Increased to favor content match over simple subscription)
    source.preferredGenres.forEach(genre => {
        if (fullText.includes(genre.toLowerCase())) {
            score += 40;
            reasons.push(`Genre Match: ${genre}`);
        }
    });

    // 6. Context/Tag Matching (+30 per match - Increased to help similar new videos surface)
    const tagKeywords: Record<string, string[]> = {
        casual: ['short', 'funny', 'meme', '切り抜き', 'まとめ', '爆笑'],
        deep: ['documentary', 'history', 'analysis', '解説', '考察', '講座', '徹底', '完全'],
        instrumental: ['instrumental', 'no talking', 'off vocal', 'bgm', 'asmr', '作業用'],
        vocal: ['cover', 'talk', 'radio', '雑談', '歌ってみた', 'karaoke'],
        live: ['live', 'stream', 'archive', '配信', '生放送'],
        solo: ['solo', 'playing', 'play', 'ぼっち', '一人'],
        collab: ['collab', 'with', 'feat', 'コラボ', 'ゲスト'],
        entertainment: ['fun', 'variety', 'エンタメ', 'ドッキリ', '企画'],
        education: ['study', 'learn', 'lesson', '講座', '勉強', 'ニュース'],
        avatar: ['vtuber', 'anime', '3d', '2d', 'live2d'],
        real: ['vlog', 'face', 'real', '実写', '顔出し']
    };

    const checkContext = (prefVal: string | undefined, key: string) => {
        if (prefVal && prefVal !== 'any' && tagKeywords[prefVal]) {
            if (tagKeywords[prefVal].some(k => fullText.includes(k))) {
                score += 30;
                reasons.push(`Context: ${prefVal}`);
            }
        }
    };

    checkContext(source.prefDepth, 'depth');
    checkContext(source.prefVocal, 'vocal');
    checkContext(source.prefLive, 'live');
    checkContext(source.prefCommunity, 'community');
    checkContext(source.prefInfoEnt, 'genre');
    checkContext(source.prefVisual, 'visual');

    // 7. Freshness Bonus
    if (source.preferredFreshness === 'new') {
        if (video.uploadedAt.includes('分前') || video.uploadedAt.includes('時間前') || video.uploadedAt.includes('日前') || video.uploadedAt.includes('hours ago')) {
            score += 20;
            reasons.push('Fresh');
        }
    }

    return { score, reasons };
};


export const getDeeplyAnalyzedRecommendations = async (sources: RecommendationSource): Promise<Video[]> => {
    const { 
        searchHistory, watchHistory, subscribedChannels, 
        preferredGenres, preferredChannels, 
        preferredFreshness = 'balanced', discoveryMode = 'balanced',
        prefDepth, prefVisual,
        page 
    } = sources;
    
    const queries: Set<string> = new Set();
    
    // ---------------------------------------------------------
    // 1. Query Generation
    // ---------------------------------------------------------

    // Helper to add context to search queries
    const getContextKeywords = () => {
        const kws: string[] = [];
        if (prefDepth === 'deep') kws.push('解説', '考察');
        if (prefVisual === 'avatar') kws.push('Vtuber');
        if (prefVisual === 'real') kws.push('vlog');
        return kws;
    };
    
    const contextSuffix = ' ' + shuffleArray(getContextKeywords()).slice(0, 1).join(' ');
    const freshnessSuffix = preferredFreshness === 'new' ? ' new' : '';

    // A. From Explicit Genres (Priority)
    preferredGenres.forEach(g => queries.add(`${g}${contextSuffix}${freshnessSuffix}`));
    
    // B. From Preferred Channels
    preferredChannels.forEach(c => queries.add(`${c}${contextSuffix}`));

    // C. From Watch History (Analyze recent interests)
    // Expanded range to capture more latent interests for new discovery
    const historyLookback = 15;
    const recentHistory = watchHistory.slice(0, historyLookback);
    recentHistory.forEach(v => {
            const keywords = extractKeywords(v.title);
            if (keywords.length > 0) {
                // Add the most significant keyword + context
                queries.add(`${keywords[0]}${contextSuffix}`);
                // Occasionally add a second keyword if available to broaden search
                if (keywords.length > 1 && Math.random() > 0.5) {
                    queries.add(`${keywords[1]}${contextSuffix}`);
                }
            }
    });

    // D. From Subscriptions (if balanced or subscribed mode)
    if (discoveryMode !== 'discovery') {
        const randomSub = subscribedChannels[Math.floor(Math.random() * subscribedChannels.length)];
        if (randomSub) queries.add(`${randomSub.name}${contextSuffix}`);
    }

    // E. Fallback / Discovery
    if (queries.size === 0 || discoveryMode === 'discovery') {
        queries.add(`Japan trending${contextSuffix}`);
        queries.add(`Gaming${contextSuffix}`);
        queries.add(`Music${contextSuffix}`);
    }

    const uniqueQueries = Array.from(queries).slice(0, 6); 
    
    // ---------------------------------------------------------
    // 2. Fetching
    // ---------------------------------------------------------
    
    const fetchPromises: Promise<any>[] = [];

    // Search Queries
    uniqueQueries.forEach(q => {
        fetchPromises.push(searchVideos(q).then(res => res.videos).catch(() => []));
    });

    // Direct Channel Feeds
    if (discoveryMode !== 'discovery' && subscribedChannels.length > 0) {
        const subsToFetch = shuffleArray(subscribedChannels).slice(0, 2);
        subsToFetch.forEach(sub => {
            fetchPromises.push(
                getChannelVideos(sub.id).then(res => 
                    res.videos.map(v => ({...v, channelName: sub.name, channelAvatarUrl: sub.avatarUrl, channelId: sub.id}))
                ).catch(() => [])
            );
        });
    }

    const results = await Promise.allSettled(fetchPromises);
    let rawCandidates: Video[] = [];
    results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            rawCandidates.push(...res.value);
        }
    });

    // Deduplicate
    const seenIds = new Set<string>();
    const uniqueCandidates: Video[] = [];
    for (const v of rawCandidates) {
        if (!seenIds.has(v.id)) {
            seenIds.add(v.id);
            uniqueCandidates.push(v);
        }
    }

    // ---------------------------------------------------------
    // 3. Scoring & Ranking (Strict Mode)
    // ---------------------------------------------------------

    const scoredVideos: ScoredVideo[] = uniqueCandidates.map(video => {
        const { score, reasons } = calculateScore(video, sources);
        return { ...video, score, debugReason: reasons };
    });

    // Filter out negative scores (NG items or Duration Mismatch)
    // Threshold is slightly lenient (-100) to allow minor mismatches but blocking hard mismatches (-500)
    const validVideos = scoredVideos.filter(v => v.score > -100);

    // Sort by Score Descending
    validVideos.sort((a, b) => b.score - a.score);

    // Return top results
    return validVideos.slice(0, 50);
};
