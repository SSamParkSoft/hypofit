import { adminSections, type AdminSection } from "../adminViewModel";
import { cn } from "../../../shared/ui/cn";

interface AdminSectionNavigationProps {
  onSectionChange: (section: AdminSection) => void;
  section: AdminSection;
}

export function AdminSectionNavigation({
  onSectionChange,
  section,
}: AdminSectionNavigationProps) {
  return (
    <nav aria-label="운영 메뉴" className="flex flex-wrap gap-2 lg:block lg:space-y-2">
      {adminSections.map((item) => (
        <button
          key={item.id}
          className={cn(
            "w-full rounded-hypo-lg px-4 py-3 text-left text-sm font-black",
            section === item.id
              ? "bg-hypo-brand text-white"
              : "text-hypo-text-muted hover:bg-white hover:text-hypo-text",
          )}
          type="button"
          aria-current={section === item.id ? "page" : undefined}
          onClick={() => onSectionChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
