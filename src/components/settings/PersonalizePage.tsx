import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef, useState } from "react";
import { SettingsButton } from "./SettingsComponents";
import { Input } from "@/components/ui/Input";
import { HeadlessButton } from "@/components/ui/HeadlessButton";
import { userContextStore } from "@/stores/userContextStore";
import { cn } from "@/lib/utils";

const truncate = (text: string, max = 90) => {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
};

export const PersonalizePage = observer(() => {
  const contexts = userContextStore.getAllContexts();
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempTitle, setTempTitle] = useState(userContextStore.getSelectedContext()?.title ?? "");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    setTempTitle(userContextStore.getSelectedContext()?.title ?? "");
    setIsRenaming(false);
  }, [userContextStore.selectedContextId]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const next = tempTitle.trim();
    if (next.length > 0) {
      userContextStore.updateSelectedContextTitle(next);
    }
    setIsRenaming(false);
  };

  const normalizedQuery = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return contexts;
    return contexts.filter(
      (c) =>
        c.title.toLowerCase().includes(normalizedQuery) ||
        (c.content || "").toLowerCase().includes(normalizedQuery),
    );
  }, [contexts, normalizedQuery]);

  const favoriteContexts = useMemo(
    () => filtered.filter((c) => userContextStore.isFavorite(c.id)),
    [filtered],
  );
  const otherContexts = useMemo(
    () => filtered.filter((c) => !userContextStore.isFavorite(c.id)),
    [filtered],
  );

  const RoleCard = ({
    ctx,
    onClick,
  }: {
    ctx: ReturnType<typeof userContextStore.getAllContexts>[number];
    onClick: () => void;
  }) => {
    const isActive = userContextStore.isContextActive(ctx.id);
    const isSelected = userContextStore.selectedContextId === ctx.id;
    const isFav = userContextStore.isFavorite(ctx.id);
    return (
      <div
        className={cn(
          "rounded-xl p-4 border transition bg-stone-900/80 border-white/10 hover:border-white/20 h-[160px]",
          isSelected ? "ring-1 ring-blue-400/50" : "",
        )}
      >
        <div className="flex items-start justify-between">
          <button
            onClick={onClick}
            className="text-left text-white font-semibold max-w-[80%] hover:underline"
          >
            {truncate(ctx.title, 40)}
          </button>
          <button
            className={cn(
              "w-6 h-6 shrink-0 rounded hover:bg-white/10 flex items-center justify-center",
              isFav ? "text-yellow-300" : "text-white/70",
            )}
            onClick={() => userContextStore.toggleFavorite(ctx.id)}
            title={isFav ? "Unpin" : "Pin to Favorites"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className={cn("w-4 h-4", isFav ? "" : "opacity-60")}
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-white/70 min-h-[54px] overflow-hidden">
          {truncate(ctx.content || "No instructions yet", 200)}
        </div>
        <div className="mt-3 flex items-center justify-between">
          {isActive ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">
              Active
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50">
              Inactive
            </span>
          )}
          <HeadlessButton
            className={cn(
              "text-xs px-2 py-1 rounded border",
              "border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5",
            )}
            onClick={onClick}
          >
            Open
          </HeadlessButton>
        </div>
      </div>
    );
  };

  const NewRoleCard = () => (
    <button
      className={cn(
        "rounded-xl p-4 border transition bg-stone-900/50 border-white/10 hover:border-white/20",
        "flex items-center justify-center h-full min-h-[120px]",
      )}
      onClick={() => {
        const id = userContextStore.addContext();
        userContextStore.setSelectedContext(id);
      }}
    >
      <div className="flex items-center gap-2 text-white/80">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <span className="font-medium">New Role</span>
      </div>
    </button>
  );

  return (
    <div className={cn("p-8 h-full overflow-hidden flex flex-col")}>
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Personalize</h1>
        </div>
        <div className="mt-3">
          <Input
            placeholder="Search roles"
            value={search}
            onChange={setSearch}
            className="bg-white/5 border border-white/10 rounded-md"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-8 pr-1 custom-scrollbar">
        {favoriteContexts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white/90 text-sm font-medium">Favorites</h3>
              <span className="text-xs text-white/40">{favoriteContexts.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {favoriteContexts.map((ctx) => (
                <RoleCard
                  key={ctx.id}
                  ctx={ctx}
                  onClick={() => userContextStore.setSelectedContext(ctx.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white/90 text-sm font-medium">All Roles</h3>
            <span className="text-xs text-white/40">
              {otherContexts.length + favoriteContexts.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {otherContexts.map((ctx) => (
              <RoleCard
                key={ctx.id}
                ctx={ctx}
                onClick={() => userContextStore.setSelectedContext(ctx.id)}
              />
            ))}
            <NewRoleCard />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {isRenaming ? (
              <Input
                ref={renameInputRef}
                value={tempTitle}
                onChange={setTempTitle}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                className="bg-white/5 border border-white/10 rounded-md max-w-[520px]"
              />
            ) : (
              <h2
                className="text-white text-lg font-semibold cursor-text"
                onDoubleClick={() => setIsRenaming(true)}
              >
                {userContextStore.getSelectedContext()?.title ?? ""}
              </h2>
            )}

            <div className="flex items-center gap-2">
              <HeadlessButton
                className={cn(
                  "w-8 h-8 rounded flex items-center justify-center border border-white/10",
                  userContextStore.isFavorite(userContextStore.selectedContextId)
                    ? "text-yellow-300"
                    : "text-white/70 hover:bg-white/5",
                )}
                onClick={() => userContextStore.toggleFavorite(userContextStore.selectedContextId)}
                title={
                  userContextStore.isFavorite(userContextStore.selectedContextId)
                    ? "Unpin"
                    : "Pin to Favorites"
                }
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </HeadlessButton>
              {userContextStore.isContextActive(userContextStore.selectedContextId) ? (
                <SettingsButton disabled>Active</SettingsButton>
              ) : (
                <SettingsButton
                  onClick={() =>
                    userContextStore.setActiveContext(userContextStore.selectedContextId)
                  }
                >
                  Activate
                </SettingsButton>
              )}
              {userContextStore.isSelectedPredefined() &&
                userContextStore.hasOverrideForSelected() && (
                  <SettingsButton onClick={() => userContextStore.resetSelectedPredefined()}>
                    Reset
                  </SettingsButton>
                )}
              {!userContextStore.isSelectedPredefined() && (
                <SettingsButton onClick={() => userContextStore.deleteSelectedContext()}>
                  Delete
                </SettingsButton>
              )}
            </div>
          </div>

          <div>
            <Input
              multiLine
              placeholder="Describe how AssistX should respond, what to prioritize, and any details about you or your work."
              value={userContextStore.getSelectedContext()?.content ?? ""}
              onChange={(v) => userContextStore.updateSelectedContextContent(v)}
              className="bg-white/5 border border-white/10 rounded-md h-full overflow-auto custom-scrollbar"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
