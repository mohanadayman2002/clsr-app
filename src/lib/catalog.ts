import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { BudgetTier, DesignStyle, ProjectStatus, RoomType } from '@/api';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const ROOM_TYPES: Record<RoomType, { label: string; icon: IconName; gradient: [string, string] }> = {
  living: { label: 'Living room', icon: 'tv-outline', gradient: ['#D9C7B0', '#9C8467'] },
  bedroom: { label: 'Bedroom', icon: 'bed-outline', gradient: ['#C9CFD6', '#7D8A99'] },
  kitchen: { label: 'Kitchen', icon: 'restaurant-outline', gradient: ['#E3D5C3', '#B08E6A'] },
  dining: { label: 'Dining', icon: 'wine-outline', gradient: ['#D8C2B6', '#9A6F5C'] },
  bathroom: { label: 'Bathroom', icon: 'water-outline', gradient: ['#CBDAD8', '#7FA19D'] },
  office: { label: 'Office', icon: 'desktop-outline', gradient: ['#D3D0C4', '#8A866F'] },
  balcony: { label: 'Balcony', icon: 'leaf-outline', gradient: ['#CFDCC5', '#7E9A6C'] },
  hallway: { label: 'Hallway', icon: 'walk-outline', gradient: ['#DDD5CB', '#A39583'] },
  other: { label: 'Other', icon: 'cube-outline', gradient: ['#D6D3CF', '#8E8A85'] },
};

export const DESIGN_STYLES: Record<DesignStyle, { label: string; description: string; swatches: string[] }> = {
  modern: { label: 'Modern', description: 'Clean lines, neutral base, bold accents', swatches: ['#F2F2F0', '#2B2B2B', '#B5A58F'] },
  scandinavian: { label: 'Scandinavian', description: 'Light woods, soft whites, cosy textiles', swatches: ['#F5F1EA', '#D9C3A0', '#8FA3A8'] },
  minimalist: { label: 'Minimalist', description: 'Few pieces, open space, calm palette', swatches: ['#FAFAF8', '#E2DED6', '#9A958C'] },
  japandi: { label: 'Japandi', description: 'Warm minimalism, natural materials', swatches: ['#EDE6DA', '#A88B6A', '#4A4238'] },
  industrial: { label: 'Industrial', description: 'Raw metal, brick, leather, dark tones', swatches: ['#5A5550', '#2E2B28', '#A0643C'] },
  classic: { label: 'Classic', description: 'Moulding, symmetry, rich fabrics', swatches: ['#F1EADF', '#7B6A55', '#2F3B4A'] },
  bohemian: { label: 'Bohemian', description: 'Layered patterns, plants, warm colour', swatches: ['#E9C9A6', '#B5543A', '#556B3E'] },
  'mid-century': { label: 'Mid-century', description: 'Walnut, tapered legs, retro hues', swatches: ['#8A5A3B', '#D9A441', '#2F5E5B'] },
};

export const BUDGET_TIERS: Record<BudgetTier, { label: string; description: string }> = {
  essential: { label: 'Essential', description: 'Affordable, practical pieces' },
  comfort: { label: 'Comfort', description: 'Mid-range quality and finish' },
  premium: { label: 'Premium', description: 'Designer and high-end pieces' },
};

export const PIPELINE_STAGES: { status: ProjectStatus; label: string; description: string }[] = [
  { status: 'queued', label: 'Uploaded', description: 'Floor plan received' },
  { status: 'analyzing', label: 'Reading the layout', description: 'Detecting walls, doors and rooms' },
  { status: 'furnishing', label: 'Furnishing', description: 'Placing furniture for your style' },
  { status: 'rendering', label: 'Rendering rooms', description: 'Producing photoreal renders' },
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  queued: 'Queued',
  analyzing: 'Analyzing',
  furnishing: 'Furnishing',
  rendering: 'Rendering',
  completed: 'Ready',
  failed: 'Failed',
};

export const isProcessing = (status: ProjectStatus) => status !== 'completed' && status !== 'failed';
