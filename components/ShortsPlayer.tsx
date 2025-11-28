
import React, { forwardRef } from 'react';
import type { Video } from '../types';
// FIX: Use named import for Link from react-router-dom
import { Link } from 'react-router-dom';

interface ShortsPlayerProps {
    video: Video;
    playerParams: string;
    onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => void;
    id?: string;
}

const ShortsPlayer = forwardRef<HTMLIFrameElement, ShortsPlayerProps>(({ video, playerParams, onLoad, id }, ref) => {
    // Ensure enablejsapi=1 is present to allow postMessage commands for playback control.
    const srcParams = playerParams.includes('enablejsapi=1') ? playerParams : `${playerParams}&enablejsapi=1`;

    return (
        <div className="h-full w-full relative flex-shrink-0 bg-yt-black group">
            <iframe
                ref={ref}
                id={id}
                src={`https://www.youtubeeducation.com/embed/${video.id}${srcParams}`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={onLoad}
                className="w-full h-full pointer-events-auto"
            ></iframe>
            
            {/* Overlay Info - Appears on hover or standard behavior */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
                <div className="flex items-center pointer-events-auto">
                    <Link to={`/channel/${video.channelId}`} className="flex items-center flex-1">
                        <img src={video.channelAvatarUrl} alt={video.channelName} className="w-10 h-10 rounded-full border border-white/20" />
                        <span className="ml-3 font-semibold truncate drop-shadow-md">{video.channelName}</span>
                    </Link>
                    <button className="bg-white text-black font-semibold px-4 py-2 rounded-full text-sm flex-shrink-0 hover:bg-gray-200 transition-colors">
                        登録
                    </button>
                </div>
                <p className="mt-3 text-sm line-clamp-2 drop-shadow-md">{video.title}</p>
            </div>
        </div>
    );
});
export default ShortsPlayer;
