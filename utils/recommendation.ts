
import type { Video, Channel } from '../types';
import { searchVideos, getChannelVideos } from './api';

// 文字列からハッシュタグや重要そうなキーワードを抽出する（精度向上）
const extractKeywords = (text: string): string[] => {
    if (!text) return [];
    // ハッシュタグを抽出
    const hashtags = text.match(/#[^\s#]+/g) || [];
    
    // 日本語や英語の名詞っぽいものを簡易的に抽出
    // 括弧内のテキストなどを重視 (e.g., [MV], 【歌ってみた】)
    const brackets = text.match(/[\[【](.+?)[\]】]/g) || [];
    
    // 通常の単語（簡易的な分割）- ノイズ除去を強化
    const rawText = text.replace(/[\[【].+?[\]】]/g, '').replace(/#[^\s#]+/g, '');
    // 記号を除去し、スペースで分割
    const words = rawText.replace(/[!-/:-@[-`{-~]/g, ' ').split(/\s+/);
    
    // クリーンアップ
    const cleanHashtags = hashtags.map(t => t.trim());
    const cleanBrackets = brackets.map(t => t.replace(/[\[【\]】]/g, '').trim());
    const cleanWords = words.filter(w => w.length > 1 && !/^(http|www|com|jp)/.test(w)); // URLや短すぎる単語を除外
    
    return [...cleanHashtags, ...cleanBrackets, ...cleanWords];
};

// 配列をシャッフルする
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// 動画の長さをパースして秒数に変換 (ISO 8601 duration format PT#H#M#S)
const parseDurationToSeconds = (isoDuration: string): number => {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = isoDuration.match(regex);
    if (!matches) return 0;
    
    const h = parseInt(matches[1] || '0', 10);
    const m = parseInt(matches[2] || '0', 10);
    const s = parseInt(matches[3] || '0', 10);
    
    return h * 3600 + m * 60 + s;
};

interface RecommendationSource {
    searchHistory: string[];
    watchHistory: Video[];
    subscribedChannels: Channel[];
    preferredGenres: string[];
    preferredChannels: string[];
    preferredDurations?: string[]; // 'short', 'medium', 'long'
    preferredFreshness?: string; // 'new', 'popular', 'balanced'
    discoveryMode?: string; // 'subscribed', 'discovery', 'balanced'
    ngKeywords?: string[];
    page: number;
}

export const getDeeplyAnalyzedRecommendations = async (sources: RecommendationSource): Promise<Video[]> => {
    const { 
        searchHistory, watchHistory, subscribedChannels, 
        preferredGenres, preferredChannels, 
        preferredDurations = [], preferredFreshness = 'balanced', discoveryMode = 'balanced', ngKeywords = [],
        page 
    } = sources;
    
    const queries: Set<string> = new Set();
    const TARGET_COUNT = 100; // 目標取得件数

    // 鮮度に基づくキーワード修飾子
    const freshnessSuffix = preferredFreshness === 'new' ? ' new' : (preferredFreshness === 'popular' ? ' best' : '');

    // 1. ユーザーの明示的な好み (PreferenceContext) - 最優先
    if (preferredGenres.length > 0) {
        // ページごとに異なるジャンルをピックアップしつつ、ランダム性も持たせる
        const baseIndex = (page - 1) % preferredGenres.length;
        queries.add(preferredGenres[baseIndex] + freshnessSuffix);
        // ランダムに2つ追加
        for(let i=0; i<2; i++) {
             queries.add(preferredGenres[Math.floor(Math.random() * preferredGenres.length)] + freshnessSuffix);
        }
    }

    if (preferredChannels.length > 0) {
        const channelName = preferredChannels[(page - 1) % preferredChannels.length];
        queries.add(`${channelName} `); 
        if (preferredFreshness === 'new') {
             queries.add(`${channelName} new`);
        }
    }

    // 2. 視聴履歴からの深い分析 (WatchHistory)
    // Discoveryモードなら履歴依存度を下げる
    if (watchHistory.length > 0 && discoveryMode !== 'discovery') {
        // 直近の履歴だけでなく、少し前の履歴からもサンプリングして多様性を出す
        const historySamples = [
            watchHistory[0], // 最新
            watchHistory[Math.floor(Math.random() * Math.min(watchHistory.length, 5))], // 直近5件からランダム
            watchHistory[Math.min(watchHistory.length - 1, 10 + Math.floor(Math.random() * 10))] // 少し前の履歴
        ].filter(Boolean);

        historySamples.forEach(video => {
             const keywords = extractKeywords(video.title + ' ' + (video.descriptionSnippet || ''));
             if (keywords.length > 0) {
                 // 具体的なキーワードの組み合わせ
                 queries.add(keywords.slice(0, 2).join(' ') + freshnessSuffix);
                 // 別の組み合わせ（多様性）
                 if (keywords.length > 2) {
                     queries.add(keywords[Math.floor(Math.random() * keywords.length)] + freshnessSuffix);
                 }
             } else {
                 queries.add(video.title.substring(0, 20));
             }
        });
    }

    // 3. 検索履歴 (SearchHistory)
    if (searchHistory.length > 0) {
        // 直近の検索ワード
        queries.add(searchHistory[0] + freshnessSuffix);
        // 過去の検索ワードからランダム
        if (searchHistory.length > 1) {
             queries.add(searchHistory[Math.floor(Math.random() * Math.min(searchHistory.length, 10))] + freshnessSuffix);
        }
    }

    // 4. 登録チャンネル (Subscriptions)
    const subPromises: Promise<any>[] = [];
    
    // Discoveryモードに基づく登録チャンネル取得数の調整
    let targetSubCount = 3;
    if (discoveryMode === 'subscribed') targetSubCount = Math.min(subscribedChannels.length, 10);
    else if (discoveryMode === 'discovery') targetSubCount = 1;
    else targetSubCount = Math.min(subscribedChannels.length, 5);

    const shuffledSubs = shuffleArray(subscribedChannels);
    
    for (let i = 0; i < targetSubCount; i++) {
        const subChannel = shuffledSubs[i];
        if (!subChannel) break;
        
        // チャンネルの最新動画を取得
        subPromises.push(
            getChannelVideos(subChannel.id).then(res => 
                // 各チャンネルから多めに取得
                res.videos.slice(0, 10).map(v => ({
                    ...v,
                    channelName: subChannel.name,
                    channelAvatarUrl: subChannel.avatarUrl,
                    channelId: subChannel.id
                }))
            ).catch(() => [])
        );
    }

    // クエリ実行 (並列処理で高速化)
    const uniqueQueries = Array.from(queries).filter(Boolean);
    
    // クエリごとの取得件数調整
    // Discoveryモードなら検索APIの比重を上げる（より多くのクエリを実行または多く取得）
    const videosPerQuery = discoveryMode === 'discovery' ? 30 : 20;
    
    const searchPromises = uniqueQueries.map(q => 
        searchVideos(q).then(res => res.videos.slice(0, videosPerQuery)).catch(() => [])
    );

    // 全てのAPIリクエストを並列実行
    const results = await Promise.allSettled([...searchPromises, ...subPromises]);
    
    let combinedVideos: Video[] = [];
    results.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            combinedVideos.push(...result.value);
        }
    });

    // 重複排除 & フィルタリング
    const seenIds = new Set<string>();
    let filteredVideos: Video[] = [];
    
    for (const video of combinedVideos) {
        if (seenIds.has(video.id)) continue;
        seenIds.add(video.id);

        // --- NGワードフィルタリング ---
        if (ngKeywords.length > 0) {
            const targetText = (video.title + ' ' + video.channelName + ' ' + (video.descriptionSnippet || '')).toLowerCase();
            const isNg = ngKeywords.some(ng => targetText.includes(ng.toLowerCase()));
            if (isNg) continue;
        }

        // --- 動画の長さフィルタリング ---
        // 選択されている場合のみ適用
        if (preferredDurations.length > 0) {
            const durationSec = parseDurationToSeconds(video.isoDuration);
            let isMatch = false;
            
            // Youtube定義: Short (<4m), Medium (4-20m), Long (>20m)
            if (preferredDurations.includes('short') && durationSec < 240) isMatch = true;
            if (preferredDurations.includes('medium') && durationSec >= 240 && durationSec <= 1200) isMatch = true;
            if (preferredDurations.includes('long') && durationSec > 1200) isMatch = true;
            
            // パースに失敗した、あるいは duration が不明な場合は、安全策として残す（あるいは除外する方針なら false）
            if (durationSec === 0) isMatch = true; 

            if (!isMatch) continue;
        }

        filteredVideos.push(video);
    }

    // ショート動画の除外（ホーム画面のおすすめにはショートをあまり混ぜない方針の場合）
    if (filteredVideos.length > 20) {
         filteredVideos = filteredVideos.filter(v => {
             const seconds = parseDurationToSeconds(v.isoDuration);
             // 明示的にShortが好まれている場合は除外しない
             if (preferredDurations.includes('short')) return true;
             
             return seconds > 60 || Math.random() > 0.7; // 30%の確率でショートも残す
         });
    }

    // シャッフルして返す
    return shuffleArray(filteredVideos).slice(0, TARGET_COUNT);
};
