import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, radius, type } from '../../theme';

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#8A938E" style={[styles.input, error && styles.inputError]} {...props} />{error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}</View>;
}

export function Select<T extends string | number>({ label, value, onChange, options, disabled = false }: { label: string; value: T; onChange: (value: T) => void; options: { label: string; value: T }[]; disabled?: boolean }) {
  return <View style={[styles.field, disabled && styles.disabled]}><Text style={styles.label}>{label}</Text><View style={styles.picker}><Picker accessibilityLabel={label} enabled={!disabled} selectedValue={value} onValueChange={(next) => onChange(next as T)}>{options.map((option) => <Picker.Item key={String(option.value)} label={option.label} value={option.value} />)}</Picker></View></View>;
}

const styles = StyleSheet.create({
  field: { gap: 6, flex: 1, minWidth: 140 }, disabled: { opacity: 0.55 }, label: { color: colors.ink, ...type.label }, input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 12, ...type.body }, inputError: { borderColor: colors.danger }, errorText: { color: colors.danger, ...type.caption }, picker: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, justifyContent: 'center' },
});
