import {
  BedDouble,
  Car,
  Utensils,
  Camera,
  ShoppingBag,
  Package,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryId } from '@/lib/constants';

/** 카테고리별 lucide 아이콘 매핑 */
const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  stay: BedDouble,
  move: Car,
  food: Utensils,
  tour: Camera,
  shop: ShoppingBag,
  etc: Package,
};

/**
 * 카테고리 아이콘. 이모지 대신 lucide 아이콘을 렌더한다.
 *   <CategoryIcon id="stay" size={16} />
 */
export function CategoryIcon({
  id,
  size = 16,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[id as CategoryId] ?? Package;
  return <Icon size={size} className={className} />;
}
