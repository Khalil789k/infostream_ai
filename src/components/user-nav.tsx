'use client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';

const getPresetClass = (photoURL: string | null | undefined) => {
  if (!photoURL) return 'bg-gradient-to-br from-blue-500 to-indigo-600';
  switch (photoURL) {
    case 'blue': return 'bg-gradient-to-br from-blue-500 to-indigo-600';
    case 'purple': return 'bg-gradient-to-br from-purple-500 to-pink-500';
    case 'emerald': return 'bg-gradient-to-br from-emerald-400 to-teal-600';
    case 'orange': return 'bg-gradient-to-br from-orange-400 to-red-500';
    case 'charcoal': return 'bg-gradient-to-br from-gray-700 to-slate-900';
    default: return 'bg-gradient-to-br from-blue-500 to-indigo-600';
  }
};

export function UserNav({ user, onSettingsSelect, onProfileSelect, onLogout }: { user: any, onSettingsSelect: () => void, onProfileSelect: () => void, onLogout: () => void }) {
  if (!user) {
    return null;
  }

  const hasRealImage = user.photoURL && (
    user.photoURL.startsWith('http') || 
    user.photoURL.startsWith('/') || 
    user.photoURL.startsWith('data:image')
  );

  return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-11 w-11 p-0 hover:bg-gray-100 rounded-full border border-gray-300 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Avatar className="h-full w-full">
              {hasRealImage ? (
                <AvatarImage src={user.photoURL} alt={user.displayName ?? ''} />
              ) : null}
              <AvatarFallback className={`${getPresetClass(user.photoURL)} text-white text-base font-bold`}>
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal border-b pb-2">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold text-gray-900">{user.displayName || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuGroup className="mt-1">
            <DropdownMenuItem onClick={onProfileSelect}>
              <UserIcon className="mr-2 h-4 w-4 text-gray-500" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSettingsSelect}>
              <Settings className="mr-2 h-4 w-4 text-gray-500" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
