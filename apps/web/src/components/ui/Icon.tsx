import React from 'react';
import {
  UserPlus,
  UserCheck,
  Users,
  CheckCircle2,
  PlayCircle,
  Flag,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Check,
  X,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  LogOut,
  Calendar,
  MapPin,
  Menu,
  MoreVertical,
  Activity,
  Trophy,
  Loader2,
  Bell,
  Sparkles,
  Eye,
  EyeOff,
  User,
  Home,
  Mail,
  Key,
  Lock,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  FileCheck,
  Award,
} from 'lucide-react';

export const ICON_MAP = {
  home: Home,
  user: User,
  mail: Mail,
  key: Key,
  lock: Lock,
  'user-plus': UserPlus,
  'user-check': UserCheck,
  users: Users,
  'check-circle': CheckCircle2,
  'play-circle': PlayCircle,
  flag: Flag,
  'x-circle': XCircle,
  clock: Clock,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  'help-circle': HelpCircle,
  sun: Sun,
  moon: Moon,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'alert-circle': AlertCircle,
  info: Info,
  check: Check,
  x: X,
  search: Search,
  filter: Filter,
  'arrow-right': ArrowRight,
  refresh: RefreshCw,
  logout: LogOut,
  'log-out': LogOut,
  calendar: Calendar,
  'map-pin': MapPin,
  menu: Menu,
  'more-vertical': MoreVertical,
  activity: Activity,
  trophy: Trophy,
  spinner: Loader2,
  bell: Bell,
  sparkles: Sparkles,
  eye: Eye,
  'eye-off': EyeOff,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  minus: Minus,
  scale: Scale,
  'file-check': FileCheck,
  award: Award,
} as const;

export type IconName = keyof typeof ICON_MAP;

export interface IconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
}

/**
 * Single controlled icon gateway for the application.
 * Radix and Lucide imports are strictly forbidden outside components/ui.
 */
export function Icon({ name, size = 16, className = '', strokeWidth, ...props }: IconProps): React.ReactElement {
  const Component = ICON_MAP[name];
  if (!Component) {
    return <span className={className} />;
  }
  return <Component size={size} className={className} strokeWidth={strokeWidth} {...props} />;
}
