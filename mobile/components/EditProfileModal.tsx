import { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { UsersAPI } from '../services/api';
import { UserRole } from '../services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  user: any;
  onSave: (updated: any) => void;
}

export default function EditProfileModal({ visible, onClose, user, onSave }: Props) {
  const { colors } = useTheme();
  const [form, setForm] = useState<any>({});
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setForm({
        name: user.name ?? '',
        surname: user.surname ?? '',
        phone: user.phone ?? '',
        email: user.email ?? '',
        hourlyRate: user.hourlyRate ? String(user.hourlyRate) : '',
        skills: user.skills ? [...user.skills] : [],
      });
      setAvatarUri(null);
    }
  }, [visible]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const addSkill = () => {
    const s = newSkill.trim();
    if (!s) return;
    setForm((prev: any) => ({ ...prev, skills: [...(prev.skills || []), s] }));
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    setForm((prev: any) => ({ ...prev, skills: prev.skills.filter((s: string) => s !== skill) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('surname', form.surname);
      fd.append('phone', form.phone);
      fd.append('email', form.email);
      if (form.hourlyRate) fd.append('hourlyRate', form.hourlyRate);
      if (form.skills?.length) fd.append('skills', JSON.stringify(form.skills));
      if (avatarUri) {
        fd.append('avatar', { uri: avatarUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      }
      const updated = await UsersAPI.updateProfile(user.id, fd);
      onSave(updated);
      onClose();
    } catch (e: any) {
      Alert.alert('Xato', e.message);
    } finally {
      setSaving(false);
    }
  };

  const s = makeStyles(colors);
  const avatarSrc = avatarUri || user.avatar;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Profilni tahrirlash</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

            {/* Avatar */}
            <TouchableOpacity style={s.avatarSection} onPress={pickAvatar}>
              {avatarSrc
                ? <Image source={{ uri: avatarSrc }} style={s.avatar} />
                : (
                  <View style={s.avatarFb}>
                    <Text style={s.avatarFbTxt}>{user.name?.charAt(0) ?? 'U'}</Text>
                  </View>
                )
              }
              <View style={s.cameraOverlay}>
                <Text style={{ fontSize: 18 }}>📷</Text>
              </View>
              <Text style={s.avatarHint}>Rasm o'zgartirish uchun bosing</Text>
            </TouchableOpacity>

            {/* Fields */}
            <View style={s.row}>
              <View style={[s.field, { flex: 1, marginRight: 8 }]}>
                <Text style={s.label}>Ism</Text>
                <TextInput style={s.input} value={form.name} onChangeText={v => setForm((p: any) => ({ ...p, name: v }))} placeholder="Ismingiz" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Familiya</Text>
                <TextInput style={s.input} value={form.surname} onChangeText={v => setForm((p: any) => ({ ...p, surname: v }))} placeholder="Familiyangiz" placeholderTextColor={colors.textMuted} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>📱 Telefon</Text>
              <TextInput style={s.input} value={form.phone} onChangeText={v => setForm((p: any) => ({ ...p, phone: v }))} keyboardType="phone-pad" placeholder="+998 90 123 45 67" placeholderTextColor={colors.textMuted} />
            </View>

            <View style={s.field}>
              <Text style={s.label}>📧 Email</Text>
              <TextInput style={s.input} value={form.email} onChangeText={v => setForm((p: any) => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" placeholder="example@mail.com" placeholderTextColor={colors.textMuted} />
            </View>

            {/* Worker-only fields */}
            {user.role === UserRole.WORKER && (
              <>
                <View style={s.divider} />
                <Text style={s.sectionTitle}>💼 Mutaxassis ma'lumotlari</Text>

                <View style={s.field}>
                  <Text style={s.label}>💰 Soatlik narx (so'm)</Text>
                  <TextInput style={s.input} value={form.hourlyRate} onChangeText={v => setForm((p: any) => ({ ...p, hourlyRate: v }))} keyboardType="numeric" placeholder="50000" placeholderTextColor={colors.textMuted} />
                </View>

                <View style={s.field}>
                  <Text style={s.label}>🔧 Ko'nikmalar</Text>
                  <View style={s.skillInputRow}>
                    <TextInput
                      style={[s.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                      value={newSkill}
                      onChangeText={setNewSkill}
                      onSubmitEditing={addSkill}
                      placeholder="Yangi ko'nikma..." placeholderTextColor={colors.textMuted}
                      returnKeyType="done"
                    />
                    <TouchableOpacity style={s.addSkillBtn} onPress={addSkill}>
                      <Text style={s.addSkillTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.skillsWrap}>
                    {form.skills?.map((sk: string, i: number) => (
                      <TouchableOpacity key={i} style={s.skillChip} onPress={() => removeSkill(sk)}>
                        <Text style={s.skillChipTxt}>{sk}</Text>
                        <Text style={s.skillRemove}> ✕</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelTxt}>Bekor qilish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveTxt}>💾 Saqlash</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof import('../hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet:   { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
    header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: c.border },
    headerTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    closeTxt:    { fontSize: 14, color: c.textSub, fontWeight: '700' },

    avatarSection: { alignItems: 'center', marginBottom: 24 },
    avatar:        { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: c.primary },
    avatarFb:      { width: 100, height: 100, borderRadius: 50, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    avatarFbTxt:   { fontSize: 40, fontWeight: '800', color: '#fff' },
    cameraOverlay: { marginTop: 8 },
    avatarHint:    { fontSize: 11, color: c.textMuted, marginTop: 4 },

    row:   { flexDirection: 'row' },
    field: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '700', color: c.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border },

    divider:      { height: 1, backgroundColor: c.border, marginVertical: 20 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 16 },

    skillInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    addSkillBtn:   { width: 44, height: 44, borderRadius: 12, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
    addSkillTxt:   { fontSize: 22, color: c.primary, fontWeight: '700' },
    skillsWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    skillChip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    skillChipTxt:  { fontSize: 13, fontWeight: '600', color: c.primary },
    skillRemove:   { fontSize: 11, color: c.primary, fontWeight: '700' },

    footer:    { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: c.border },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: 'center' },
    cancelTxt: { fontSize: 15, fontWeight: '700', color: c.textSub },
    saveBtn:   { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveTxt:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  });
