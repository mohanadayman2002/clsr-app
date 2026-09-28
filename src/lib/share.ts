import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import type { Render } from '@/api';

export async function shareRender(render: Render) {
  if (!render.uri) {
    Alert.alert('Not available yet', 'Sharing will work once renders come from the CLSR service.');
    return;
  }
  // TODO(clsr): remote render URLs need downloading to a local file before sharing.
  if (!render.uri.startsWith('file://') || !(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing unavailable', 'This render cannot be shared from this device.');
    return;
  }
  await Sharing.shareAsync(render.uri, { mimeType: 'image/jpeg', dialogTitle: 'Share render' });
}
