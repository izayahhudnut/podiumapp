import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { colors, radii, spacing } from '../theme';

export type CreateDebateValues = {
  title: string;
  topic: string;
  description: string;
  isPublic: boolean;
  factCheckEnabled: boolean;
  audienceCommentsEnabled: boolean;
  askToJoinEnabled: boolean;
  scheduledFor: string | null;
  thumbnailUri: string | null;
};

type CreateDebateScreenProps = {
  onBack: () => void;
  onStartDebate: (values: CreateDebateValues) => Promise<void>;
  submitting: boolean;
  errorMessage: string | null;
};

type LaunchMode = 'now' | 'schedule';

function generateDateOptions(): Array<{ value: string; label: string }> {
  const options = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const value = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const label =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Tomorrow'
          : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    options.push({ value, label });
  }

  return options;
}

function generateTimeOptions(selectedDate: string): Array<{ value: string; label: string }> {
  const options = [];
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const isToday = selectedDate === today;

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (isToday) {
        const slotMinutes = h * 60 + m;
        const nowMinutes = now.getHours() * 60 + now.getMinutes() + 30;
        if (slotMinutes <= nowMinutes) {
          continue;
        }
      }

      const period = h < 12 ? 'AM' : 'PM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const displayMin = m === 0 ? '00' : '30';
      const value = `${String(h).padStart(2, '0')}:${displayMin}`;
      const label = `${displayHour}:${displayMin} ${period}`;
      options.push({ value, label });
    }
  }

  return options;
}

function buildScheduledFor(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function CreateDebateScreen({
  onBack,
  onStartDebate,
  submitting,
  errorMessage,
}: CreateDebateScreenProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [launchMode, setLaunchMode] = useState<LaunchMode>('now');
  const [tools, setTools] = useState({
    factCheck: true,
    audienceComments: true,
    askToJoin: true,
  });
  const [permission, requestPermission] = useCameraPermissions();

  const dateOptions = useMemo(() => generateDateOptions(), []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  const timeOptions = useMemo(() => generateTimeOptions(selectedDate), [selectedDate]);
  const [selectedTime, setSelectedTime] = useState(() => generateTimeOptions(dateOptions[0].value)[0]?.value ?? '12:00');
  const timeScrollRef = useRef<ScrollView>(null);

  // Reset time to first available slot when date changes
  useEffect(() => {
    const newOptions = generateTimeOptions(selectedDate);
    const stillValid = newOptions.some((o) => o.value === selectedTime);
    if (!stillValid && newOptions.length > 0) {
      setSelectedTime(newOptions[0].value);
      timeScrollRef.current?.scrollTo({ x: 0, animated: true });
    }
  }, [selectedDate, selectedTime]);

  function toggleTool(tool: keyof typeof tools) {
    setTools((current) => ({ ...current, [tool]: !current[tool] }));
  }

  async function handlePickThumbnail() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      mediaTypes: ['images'],
    });

    if (!result.canceled) {
      setThumbnailUri(result.assets[0]?.uri ?? null);
    }
  }

  async function handleSubmit() {
    const scheduledFor =
      launchMode === 'schedule' ? buildScheduledFor(selectedDate, selectedTime) : null;

    await onStartDebate({
      title: title.trim(),
      topic: topic.trim(),
      description: description.trim(),
      isPublic,
      factCheckEnabled: tools.factCheck,
      audienceCommentsEnabled: tools.audienceComments,
      askToJoinEnabled: tools.askToJoin,
      scheduledFor,
      thumbnailUri,
    });
  }

  const submitLabel = submitting
    ? launchMode === 'schedule'
      ? 'Scheduling...'
      : 'Starting...'
    : launchMode === 'schedule'
      ? 'Schedule Debate'
      : 'Go Live';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>New Debate</Text>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textPrimary} name="close" size={22} />
        </Pressable>
      </View>

      {/* Launch mode toggle */}
      <View style={styles.launchModeRow}>
        <Pressable
          style={({ pressed }) => [
            styles.launchModeCard,
            launchMode === 'now' && styles.launchModeCardActive,
            pressed && styles.pressed,
          ]}
          onPress={() => setLaunchMode('now')}
          disabled={submitting}
        >
          <Ionicons
            name="radio"
            size={18}
            color={launchMode === 'now' ? '#F2387A' : colors.textDim}
          />
          <Text style={launchMode === 'now' ? styles.launchModeLabelActive : styles.launchModeLabel}>
            Go Live Now
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.launchModeCard,
            launchMode === 'schedule' && styles.launchModeCardActive,
            pressed && styles.pressed,
          ]}
          onPress={() => setLaunchMode('schedule')}
          disabled={submitting}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={launchMode === 'schedule' ? '#F2387A' : colors.textDim}
          />
          <Text
            style={launchMode === 'schedule' ? styles.launchModeLabelActive : styles.launchModeLabel}
          >
            Schedule
          </Text>
        </Pressable>
      </View>

      {/* Date / time picker */}
      {launchMode === 'schedule' ? (
        <View style={styles.schedulePicker}>
          <Text style={styles.label}>Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {dateOptions.map((option) => (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.chip,
                  selectedDate === option.value && styles.chipActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => setSelectedDate(option.value)}
                disabled={submitting}
              >
                <Text
                  style={selectedDate === option.value ? styles.chipTextActive : styles.chipText}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Time</Text>
          <ScrollView
            ref={timeScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {timeOptions.length === 0 ? (
              <Text style={styles.chipText}>No times available</Text>
            ) : (
              timeOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.chip,
                    selectedTime === option.value && styles.chipActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedTime(option.value)}
                  disabled={submitting}
                >
                  <Text
                    style={
                      selectedTime === option.value ? styles.chipTextActive : styles.chipText
                    }
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.cameraBlock}>
          {permission?.granted ? (
            <CameraView facing="front" style={styles.cameraPreview} />
          ) : (
            <View style={styles.cameraFallback}>
              <Text style={styles.cameraFallbackTitle}>Camera preview</Text>
              <Text style={styles.cameraFallbackCopy}>
                Let Podium access the camera so the host can open a real room.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
                onPress={() => {
                  void requestPermission();
                }}
              >
                <Text style={styles.permissionButtonText}>Enable camera</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            placeholder="What's the debate about?"
            placeholderTextColor={colors.textFaint}
            style={styles.lineInput}
            value={title}
            onChangeText={setTitle}
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Topic</Text>
          <TextInput
            placeholder="Politics, tech, sports..."
            placeholderTextColor={colors.textFaint}
            style={styles.lineInput}
            value={topic}
            onChangeText={setTopic}
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            multiline
            placeholder="Optional context, format, or rules..."
            placeholderTextColor={colors.textFaint}
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            editable={!submitting}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Thumbnail</Text>
          <Pressable
            style={({ pressed }) => [styles.thumbnailPicker, pressed && styles.pressed]}
            onPress={() => { void handlePickThumbnail(); }}
            disabled={submitting}
          >
            {thumbnailUri ? (
              <View style={styles.thumbnailPreviewWrap}>
                <Image source={{ uri: thumbnailUri }} style={styles.thumbnailPreview} />
                <Pressable
                  style={styles.removeThumbnail}
                  onPress={() => setThumbnailUri(null)}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.thumbnailEmpty}>
                <Ionicons name="image-outline" size={30} color={colors.textDim} />
                <Text style={styles.thumbnailEmptyText}>Add thumbnail</Text>
                <Text style={styles.thumbnailEmptyHint}>16:9 · Shows on debate card</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Privacy</Text>
          <View style={styles.privacyGrid}>
            <Pressable
              style={({ pressed }) => [
                styles.privacyCard,
                isPublic && styles.privacyCardActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setIsPublic(true)}
              disabled={submitting}
            >
              <Text style={isPublic ? styles.privacyTitleActive : styles.privacyTitle}>Public</Text>
              <Text style={isPublic ? styles.privacyDetailActive : styles.privacyDetail}>
                Open to everyone
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.privacyCard,
                !isPublic && styles.privacyCardActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setIsPublic(false)}
              disabled={submitting}
            >
              <Text style={!isPublic ? styles.privacyTitleActive : styles.privacyTitle}>
                Private
              </Text>
              <Text style={!isPublic ? styles.privacyDetailActive : styles.privacyDetail}>
                Invite only
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Live tools</Text>
          <View style={styles.toolList}>
            <View style={styles.toolRow}>
              <Text style={styles.toolName}>AI fact-check</Text>
              <Switch
                disabled={submitting}
                ios_backgroundColor={colors.borderSoft}
                onValueChange={() => toggleTool('factCheck')}
                thumbColor={colors.textPrimary}
                trackColor={{ false: colors.surface, true: '#F2387A' }}
                value={tools.factCheck}
              />
            </View>
            <View style={styles.toolRow}>
              <Text style={styles.toolName}>Audience comments</Text>
              <Switch
                disabled={submitting}
                ios_backgroundColor={colors.borderSoft}
                onValueChange={() => toggleTool('audienceComments')}
                thumbColor={colors.textPrimary}
                trackColor={{ false: colors.surface, true: '#F2387A' }}
                value={tools.audienceComments}
              />
            </View>
            <View style={styles.toolRow}>
              <Text style={styles.toolName}>Ask to join</Text>
              <Switch
                disabled={submitting}
                ios_backgroundColor={colors.borderSoft}
                onValueChange={() => toggleTool('askToJoin')}
                thumbColor={colors.textPrimary}
                trackColor={{ false: colors.surface, true: '#F2387A' }}
                value={tools.askToJoin}
              />
            </View>
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}
          onPress={() => {
            void handleSubmit();
          }}
          disabled={submitting}
        >
          <Text style={styles.submitText}>{submitLabel}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '300',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  launchModeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  launchModeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
  launchModeCardActive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
  },
  launchModeLabel: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '400',
  },
  launchModeLabelActive: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  schedulePicker: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  chipText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '400',
  },
  chipTextActive: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  cameraBlock: {
    overflow: 'hidden',
    minHeight: 240,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cameraPreview: {
    minHeight: 240,
  },
  cameraFallback: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cameraFallbackTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  cameraFallbackCopy: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '300',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.textPrimary,
  },
  permissionButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    gap: spacing.xl,
  },
  field: {
    gap: spacing.md,
  },
  label: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '400',
  },
  lineInput: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '300',
  },
  textarea: {
    minHeight: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '300',
  },
  privacyGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  privacyCard: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  privacyCardActive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
  },
  privacyTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '300',
  },
  privacyDetail: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '300',
  },
  privacyTitleActive: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '300',
  },
  privacyDetailActive: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '300',
  },
  toolList: {
    gap: spacing.md,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  toolName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '300',
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.textPrimary,
    marginTop: spacing.sm,
  },
  submitText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  thumbnailPicker: {
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumbnailPreviewWrap: {
    position: 'relative',
  },
  thumbnailPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  removeThumbnail: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  thumbnailEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  thumbnailEmptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '400',
  },
  thumbnailEmptyHint: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '300',
  },
  errorText: {
    color: '#FF7A7A',
    fontSize: 13,
    fontWeight: '400',
  },
  pressed: {
    opacity: 0.88,
  },
});
