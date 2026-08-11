import { useAuth } from "../features/auth/useAuth";
import { BlockConfirmDialog } from "../features/chat/components/BlockConfirmDialog";
import { ChatRoomListPanel } from "../features/chat/components/ChatRoomListPanel";
import { ChatThread } from "../features/chat/components/ChatThread";
import { CounterpartProfileSheet } from "../features/chat/components/CounterpartProfileSheet";
import { InterviewContextPanel } from "../features/chat/components/InterviewContext";
import { getCounterpart } from "../features/chat/model/chatRoomModel";
import { useChatRoomListController } from "../features/chat/model/useChatRoomListController";
import { useChatRoomSelection } from "../features/chat/model/useChatRoomSelection";
import { useChatRooms } from "../features/chat/useChatRooms";
import { cn } from "../shared/ui/cn";
import { EmptyState } from "../shared/ui/state";
import { getWorkspaceRegionClassName } from "../shared/ui/workspace";

export function ChatPage() {
  const { accessToken, appUser } = useAuth();
  const { data: rooms = [], isError, isLoading } = useChatRooms(accessToken);
  const appUserId = appUser?.id ?? null;
  const roomSelection = useChatRoomSelection(rooms);
  const roomList = useChatRoomListController({
    appUserId,
    onSelectedRoomHidden: roomSelection.clearSelectedRoomSelection,
    rooms,
    selectedRoomId: roomSelection.selectedRoomId,
  });
  const selectedRoom = roomSelection.selectedRoom;
  const profileRoom = roomList.profileRoom;
  const blockTargetRoom = roomList.blockTargetRoom;

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-none bg-hypo-bg min-[1200px]:m-6 min-[1200px]:w-auto min-[1200px]:grid-cols-[320px_minmax(0,1fr)] min-[1200px]:gap-0 min-[1200px]:rounded-hypo-lg min-[1200px]:border min-[1200px]:border-hypo-border/80 min-[1200px]:bg-hypo-surface min-[1600px]:grid-cols-[320px_minmax(0,1fr)_300px]",
        getWorkspaceRegionClassName({ height: "content", scroll: "clip" }),
        getWorkspaceRegionClassName({ height: "framedDesktop" }),
      )}
    >
      <ChatRoomListPanel
        activeFilter={roomList.activeFilter}
        appUserId={appUserId}
        blockedRoomIds={roomList.blockedRoomIds}
        filterCounts={roomList.filterCounts}
        getIsMuted={roomList.getIsMuted}
        isError={isError}
        isLoading={isLoading}
        isThreadOpen={roomSelection.isThreadOpen}
        onActiveFilterChange={roomList.setActiveFilter}
        onBlock={roomList.requestBlock}
        onHide={roomList.hideRoom}
        onMuteToggle={roomList.toggleMute}
        onProfileOpen={roomList.setProfileRoom}
        onReport={roomList.requestReport}
        onSearchQueryChange={roomList.setSearchQuery}
        onSelect={roomSelection.selectRoom}
        rooms={rooms}
        searchQuery={roomList.searchQuery}
        selectedRoomId={roomSelection.selectedRoomId}
        visibleRooms={roomList.visibleRooms}
      />

      {selectedRoom ? (
        <ChatThread
          accessToken={accessToken}
          appUserId={appUserId}
          isBlocked={
            roomList.blockedRoomIds.has(selectedRoom.id) || selectedRoom.status === "blocked"
          }
          isMuted={roomList.getIsMuted(selectedRoom)}
          room={selectedRoom}
          onBlock={() => roomList.requestBlock(selectedRoom)}
          onBack={roomSelection.closeThread}
          onHide={() => roomList.hideRoom(selectedRoom.id)}
          onMuteToggle={() => roomList.toggleMute(selectedRoom)}
          onProfileOpen={() => roomList.setProfileRoom(selectedRoom)}
          onReport={() => roomList.requestReport(selectedRoom)}
        />
      ) : (
        <section className="hidden min-h-[520px] place-items-center bg-hypo-surface p-6 min-[1200px]:grid">
          <EmptyState className="max-w-md border-0 bg-transparent p-0" title="채팅방을 선택해주세요.">
            인터뷰를 신청하거나 신청을 받으면 여기서 대화를 이어갈 수 있어요.
          </EmptyState>
        </section>
      )}

      <InterviewContextPanel appUserId={appUserId} room={selectedRoom} />

      {profileRoom ? (
        <CounterpartProfileSheet
          appUserId={appUserId}
          room={profileRoom}
          onBlock={() => roomList.requestBlock(profileRoom)}
          onClose={() => roomList.setProfileRoom(null)}
          onReport={() => roomList.requestReport(profileRoom)}
        />
      ) : null}

      {blockTargetRoom ? (
        <BlockConfirmDialog
          counterpartName={getCounterpart(blockTargetRoom, appUserId).name}
          onCancel={() => roomList.setBlockTargetRoom(null)}
          onConfirm={roomList.confirmBlock}
        />
      ) : null}
    </div>
  );
}
