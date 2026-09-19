import {
  BedDouble,
  Car,
  Utensils,
  Camera,
  ShoppingBag,
  Package,
  Landmark,
  PartyPopper,
  Bike,
  type LucideIcon,
} from 'lucide-react';

/**
 * 카테고리별 lucide 아이콘 매핑.
 * 예산용(stay/move/food/tour/shop/etc)과 일정용 TourAPI 분류
 * (attraction/culture/festival/leisure/lodging/food/shopping/transport/etc)를 모두 커버.
 */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  // 예산용
  stay: BedDouble,
  move: Car,
  food: Utensils,
  tour: Camera,
  shop: ShoppingBag,
  etc: Package,
  // 일정용(TourAPI 분류)
  attraction: Camera, // 관광지
  culture: Landmark, // 문화시설
  festival: PartyPopper, // 축제·공연
  leisure: Bike, // 레포츠
  lodging: BedDouble, // 숙박
  shopping: ShoppingBag, // 쇼핑
  transport: Car, // 교통
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
  const Icon = CATEGORY_ICON[id] ?? Package;
  return <Icon size={size} className={className} />;
}
