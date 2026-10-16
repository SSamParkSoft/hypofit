import { SearchField } from "@/shared/ui/SearchField";

type Props = {
  glassAvailable: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

export function PostingSearchField({ onChangeText, placeholder, value }: Props) {
  return (
    <SearchField
      accessibilityLabel="공고 검색"
      containerClassName="h-12 flex-1"
      placeholder={placeholder}
      returnKeyType="search"
      value={value}
      onChangeText={onChangeText}
    />
  );
}
