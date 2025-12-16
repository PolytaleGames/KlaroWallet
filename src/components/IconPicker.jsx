import React from 'react';
import { createPortal } from 'react-dom';
import {
    Briefcase, Star, Zap, Home, ShoppingCart, Coffee, MoreHorizontal,
    Smartphone, Car, Plane, Gift, Heart, Music, Book, Camera,
    Dumbbell, Utensils, Wifi, Droplet, Sun, Moon, Umbrella,
    Award, Target, Anchor, Map, Globe, Flag, Key, Lock,
    Smile, Frown, Meh, DollarSign, CreditCard, Wallet, PieChart,
    TrendingUp, TrendingDown, Activity, AlertCircle, Bell, Calendar,
    Check, Clock, Cloud, Code, Compass, Copy, Database, Disc,
    Edit, Eye, File, Filter, Folder, Grid, Hash, Image, Inbox,
    Info, Layers, Layout, LifeBuoy, Link, List, Loader, LogIn,
    LogOut, Mail, Maximize, Menu, MessageCircle, MessageSquare,
    Mic, Minimize, Monitor, Mouse, Move, Navigation, Octagon,
    Package, Paperclip, Pause, Phone, Play, Power, Printer,
    Radio, RefreshCw, Save, Scissors, Search, Send, Server,
    Settings, Share, Shield, ShoppingBag, Shuffle, Sidebar,
    SkipBack, SkipForward, Slack, Slash, Sliders, Speaker,
    Square, StopCircle, Tablet, Tag, Terminal, Thermometer,
    ThumbsDown, ThumbsUp, ToggleLeft, ToggleRight,
    Trash, Trash2, Truck, Tv, Twitch, Twitter, Type,
    Underline, Unlock, Upload, User, UserCheck, UserMinus,
    UserPlus, UserX, Users, Video, Voicemail, Volume, Volume1,
    Volume2, VolumeX, Watch, Webcam, Wind, X, XCircle, XOctagon,
    XSquare, Youtube, ZoomIn, ZoomOut
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Export the map so other components can render icons by name
export const ICON_MAP = {
    Briefcase, Star, Zap, Home, ShoppingCart, Coffee, MoreHorizontal,
    Smartphone, Car, Plane, Gift, Heart, Music, Book, Camera,
    Dumbbell, Utensils, Wifi, Droplet, Sun, Moon, Umbrella,
    Award, Target, Anchor, Map, Globe, Flag, Key, Lock,
    Smile, Frown, Meh, DollarSign, CreditCard, Wallet, PieChart,
    TrendingUp, TrendingDown, Activity, AlertCircle, Bell, Calendar,
    Check, Clock, Cloud, Code, Compass, Copy, Database, Disc,
    Edit, Eye, File, Filter, Folder, Grid, Hash, Image, Inbox,
    Info, Layers, Layout, LifeBuoy, Link, List, Loader, LogIn,
    LogOut, Mail, Maximize, Menu, MessageCircle, MessageSquare,
    Mic, Minimize, Monitor, Mouse, Move, Navigation, Octagon,
    Package, Paperclip, Pause, Phone, Play, Power, Printer,
    Radio, RefreshCw, Save, Scissors, Search, Send, Server,
    Settings, Share, Shield, ShoppingBag, Shuffle, Sidebar,
    SkipBack, SkipForward, Slack, Slash, Sliders, Speaker,
    Square, StopCircle, Tablet, Tag, Terminal, Thermometer,
    ThumbsDown, ThumbsUp, ToggleLeft, ToggleRight,
    Trash, Trash2, Truck, Tv, Twitch, Twitter, Type,
    Underline, Unlock, Upload, User, UserCheck, UserMinus,
    UserPlus, UserX, Users, Video, Voicemail, Volume, Volume1,
    Volume2, VolumeX, Watch, Webcam, Wind, X, XCircle, XOctagon,
    XSquare, Youtube, ZoomIn, ZoomOut
};

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const IconPicker = ({ selectedIcon, onSelect, onClose }) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredIcons = Object.keys(ICON_MAP).filter(iconName =>
        iconName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-6 m-4 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Select an Icon</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Close</button>
                </div>

                <input
                    type="text"
                    placeholder="Search icons..."
                    className="w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                />

                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 overflow-y-auto p-2 flex-1">
                    {filteredIcons.map(iconName => {
                        const Icon = ICON_MAP[iconName];
                        const isSelected = selectedIcon === iconName;

                        return (
                            <button
                                key={iconName}
                                onClick={() => onSelect(iconName)}
                                className={cn(
                                    "aspect-square flex flex-col items-center justify-center rounded-xl transition-all p-1",
                                    isSelected
                                        ? "bg-slate-900 text-white shadow-md scale-110"
                                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:scale-105"
                                )}
                                title={iconName}
                            >
                                <Icon size={20} />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IconPicker;
