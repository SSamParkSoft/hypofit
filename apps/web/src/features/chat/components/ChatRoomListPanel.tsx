import type { ChatRoom } from "../../../shared/api/types";
import { NotificationButton } from "../../../shared/ui/notification-button";
import { EmptyState, ErrorState } from "../../../shared/ui/state";
import { cn } from "../../../shared/ui/cn";
import { getWorkspaceRegionClassName } from "../../../shared/ui/workspace";
import { type ChatFilter, getRoomDisplayStatus } from "../model/chatRoomModel";
import { ChatFilterTabs } from "./ChatFilterTabs";
import { ChatRoomPreview } from "./ChatRoomPreview";

interface ChatRoomListPanelProps {
  activeFilter: ChatFilter;
  appUserId: string | null;
  blockedRoomIds: Set<string>;
  filterCounts: Record<ChatFilter, number>;
  getIsMuted: (room: ChatRoom) => boolean;
  isError: boolean;
  isLoading: boolean;
  isThreadOpen: boolean;
  onActiveFilterChange: (filter: ChatFilter) => void;
  onBlock: (room: ChatRoom) => void;
  onHide: (roomId: string) => void;
  onMuteToggle: (room: ChatRoom) => void;
  onProfileOpen: (room: ChatRoom) => void;
  onReport: (room: ChatRoom) => void;
  onSearchQueryChange: (value: string) => void;
  onSelect: (roomId: string) => void;
  rooms: ChatRoom[];
  searchQuery: string;
  selectedRoomId: string | null;
  visibleRooms: ChatRoom[];
}

export function ChatRoomListPanel({
  activeFilter,
  appUserId,
  blockedRoomIds,
  filterCounts,
  getIsMuted,
  isError,
  isLoading,
  isThreadOpen,
  onActiveFilterChange,
  onBlock,
  onHide,
  onMuteToggle,
  onProfileOpen,
  onReport,
  onSearchQueryChange,
  onSelect,
  rooms,
  searchQuery,
  selectedRoomId,
  visibleRooms,
}: ChatRoomListPanelProps) {
  return (
    <section
      className={cn(
        "grid grid-rows-[auto_minmax(0,1fr)] bg-hypo-surface min-[1200px]:border-r min-[1200px]:border-hypo-border",
        getWorkspaceRegionClassName({ height: "content", scroll: "clip" }),
        isThreadOpen && "hidden min-[1200px]:grid",
      )}
    >
      <div className="px-5 pb-3 pt-[calc(var(--app-safe-top)+1.25rem)] md:pt-5 min-[1200px]:border-b min-[1200px]:border-hypo-border min-[1200px]:px-5 min-[1200px]:py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-8 text-hypo-text min-[1200px]:text-lg min-[1200px]:leading-6">
              채팅
            </h1>
          </div>
          <NotificationButton className="min-[1200px]:size-9" />
        </div>
        <label className="mt-4 block" htmlFor="chat-search">
          <span className="sr-only">채팅 검색</span>
          <input
            className="h-10 w-full rounded-hypo-md border border-hypo-border bg-hypo-bg px-3.5 text-sm font-medium text-hypo-text outline-none placeholder:text-hypo-text-soft focus:border-hypo-brand focus:ring-[3px] focus:ring-hypo-brand/15"
            id="chat-search"
            placeholder="이름, 모집글 검색"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </label>
        <ChatFilterTabs
          activeFilter={activeFilter}
          counts={filterCounts}
          onChange={onActiveFilterChange}
        />
      </div>

      <div
        className={cn(
          "px-5 pb-[calc(var(--app-safe-bottom)+1rem)] min-[1200px]:px-0 min-[1200px]:pb-0",
          getWorkspaceRegionClassName({ scroll: "panel" }),
        )}
      >
        <div className="min-h-full divide-y divide-hypo-border/80">
          {isLoading ? <ChatRoomListLoading /> : null}

          {isError ? (
            <ErrorState
              className="rounded-none border-0 bg-transparent px-0 py-4 text-left"
              title="채팅방을 불러오지 못했습니다."
            >
              API 연결 상태를 확인한 뒤 다시 시도하세요.
            </ErrorState>
          ) : null}

          {!isLoading && !isError && rooms.length === 0 ? (
            <EmptyState
              className="rounded-none border-0 bg-transparent px-0 py-8 text-left"
              title="아직 열린 채팅이 없습니다."
            >
              인터뷰를 신청하면 채팅방이 열려요.
            </EmptyState>
          ) : null}

          {!isLoading &&
          !isError &&
          rooms.length > 0 &&
          visibleRooms.length === 0 ? (
            <EmptyState
              className="rounded-none border-0 bg-transparent px-0 py-8 text-left"
              title="검색 결과가 없습니다."
            >
              이름이나 모집글 제목을 다시 확인해보세요.
            </EmptyState>
          ) : null}

          {visibleRooms.map((room) => (
            <ChatRoomPreview
              key={room.id}
              appUserId={appUserId}
              isMuted={getIsMuted(room)}
              isSelected={room.id === selectedRoomId}
              room={room}
              status={getRoomDisplayStatus(room, blockedRoomIds.has(room.id))}
              unreadCount={room.unread_count}
              onBlock={() => onBlock(room)}
              onHide={() => onHide(room.id)}
              onMuteToggle={() => onMuteToggle(room)}
              onProfileOpen={() => onProfileOpen(room)}
              onReport={() => onReport(room)}
              onSelect={() => onSelect(room.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChatRoomListLoading() {
  return (
    <div
      aria-atomic="true"
      aria-busy="true"
      aria-label="채팅방을 불러오는 중입니다."
      className="divide-y divide-hypo-border/80"
      role="status"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="grid min-h-[74px] grid-cols-[40px_minmax(0,1fr)_28px] gap-3 px-4 py-3 motion-safe:animate-pulse"
        >
          <span className="size-10 rounded-hypo-lg bg-hypo-surface-muted" />
          <span className="grid min-w-0 content-center gap-2">
            <span className="h-3.5 w-2/5 rounded-hypo-sm bg-hypo-surface-muted" />
            <span className="h-3 w-4/5 rounded-hypo-sm bg-hypo-surface-muted" />
            <span className="h-3 w-3/5 rounded-hypo-sm bg-hypo-surface-muted" />
          </span>
          <span className="mt-1 h-3 w-7 rounded-hypo-sm bg-hypo-surface-muted" />
        </div>
      ))}
    </div>
  );
}
