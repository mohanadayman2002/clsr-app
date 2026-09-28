import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import type { FloorPlanFile } from '@/api';
import { FlowScreen } from '@/components/flow';
import { FloorPlanPreview } from '@/components/media';
import { AppText, Button, Card } from '@/components/ui';
import type { IconName } from '@/lib/catalog';
import { formatFileSize } from '@/lib/format';
import { useDraft } from '@/store/draft';
import { radius, spacing, useAppTheme } from '@/theme';

const TIPS = [
  'Top-down view with walls clearly visible',
  'Room labels and dimensions help accuracy',
  'JPG, PNG or PDF, up to 20 MB',
];

function fromImageAsset(asset: ImagePicker.ImagePickerAsset): FloorPlanFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? `floor-plan-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    width: asset.width,
    height: asset.height,
    size: asset.fileSize,
  };
}

export default function UploadStep() {
  const { floorPlan, setFloorPlan } = useDraft();
  const { colors } = useAppTheme();

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to photograph your floor plan.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) setFloorPlan(fromImageAsset(result.assets[0]));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) setFloorPlan(fromImageAsset(result.assets[0]));
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setFloorPlan({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size,
    });
  };

  return (
    <FlowScreen
      step={1}
      title="Upload your floor plan"
      subtitle="CLSR reads the layout, furnishes every room and renders it for you."
      footer={<Button title="Continue" icon="arrow-forward" disabled={!floorPlan} onPress={() => router.push('/new/details')} />}>
      {floorPlan ? (
        <Card padded={false}>
          <View style={styles.preview}>
            <FloorPlanPreview file={floorPlan} />
          </View>
          <View style={styles.fileRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <View style={styles.flex}>
              <AppText variant="label" numberOfLines={1}>
                {floorPlan.name}
              </AppText>
              <AppText variant="caption">
                {[floorPlan.mimeType, formatFileSize(floorPlan.size)].filter(Boolean).join(' · ')}
              </AppText>
            </View>
            <Button title="Replace" variant="secondary" compact onPress={() => setFloorPlan(undefined)} />
          </View>
        </Card>
      ) : (
        <View style={styles.sources}>
          {Platform.OS !== 'web' && (
            <SourceOption icon="camera-outline" title="Take a photo" subtitle="Photograph a printed plan" onPress={takePhoto} />
          )}
          <SourceOption icon="image-outline" title="Choose from photos" subtitle="Screenshot or saved image" onPress={pickImage} />
          <SourceOption icon="document-outline" title="Import a file" subtitle="PDF or image from Files" onPress={pickFile} />
        </View>
      )}

      <Card style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted }}>
        <AppText variant="label" style={styles.tipsTitle}>
          For the best results
        </AppText>
        {TIPS.map((tip) => (
          <View key={tip} style={styles.tip}>
            <Ionicons name="checkmark" size={16} color={colors.accent} />
            <AppText variant="caption" color="textMuted" style={styles.flex}>
              {tip}
            </AppText>
          </View>
        ))}
      </Card>
    </FlowScreen>
  );
}

function SourceOption({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.source,
        { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={[styles.sourceIcon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.flex}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption">{subtitle}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sources: { gap: spacing.md },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  sourceIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  preview: { height: 240 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  tipsTitle: { marginBottom: spacing.sm },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: 2 },
});
