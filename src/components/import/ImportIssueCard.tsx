import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AcademicImportDraft, AcademicImportIssue, AcademicSheet, updateAcademicCell } from '../../domain/academicWorkbook';
import { colors, space, type } from '../../theme';
import { Card } from '../primitives/Card';
import { Field } from '../primitives/Field';
import { StatusPill } from '../primitives/StatusPill';

export function ImportIssueCard({ issue, draft, onChange }: { issue: AcademicImportIssue; draft: AcademicImportDraft; onChange: (draft: AcademicImportDraft) => void }) {
  const editable = issue.sheet !== 'Workbook' && issue.row >= 2;
  const sheet = editable ? issue.sheet as AcademicSheet : null;
  const column = sheet ? draft.rows[sheet][0]?.indexOf(issue.field) ?? -1 : -1;
  const value = sheet && column >= 0 ? draft.rows[sheet][issue.row - 1]?.[column] ?? '' : '';
  return <Card style={styles.card}>
    <View style={styles.heading}><Text style={styles.location}>{issue.sheet}{issue.row ? ` · row ${issue.row}` : ''}</Text><StatusPill label={issue.severity === 'error' ? 'Blocking' : 'Review'} tone={issue.severity === 'error' ? 'danger' : 'warning'} /></View>
    <Text accessibilityRole="alert" style={styles.message}>{issue.message}</Text>
    {sheet && column >= 0 ? <Field label={issue.field} value={value} onChangeText={(next) => onChange(updateAcademicCell(draft, sheet, issue.row, issue.field, next))} /> : <Text style={styles.helper}>Correct this item in the workbook, then select the file again.</Text>}
  </Card>;
}

const styles = StyleSheet.create({ card: { gap: space.sm }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }, location: { color: colors.ink, ...type.label }, message: { color: colors.danger, ...type.body }, helper: { color: colors.muted, ...type.caption } });
