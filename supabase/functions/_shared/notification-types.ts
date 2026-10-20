/** Types communs aux rappels du téléphone et aux notifications envoyées par Supabase. */
export const NOTIFICATION_TYPES = [
  { key: 'water', label: 'Arrosage', detail: 'Quand vos plantes ont besoin d’eau', example: 'À arroser : vos plantes' },
  { key: 'sow_indoor', label: 'Semis sous abri', detail: 'Préparer les semis avant la mise en place', example: 'Semis sous abri : vos prochaines cultures' },
  { key: 'sow_outdoor', label: 'Semis en place et levée', detail: 'Semer directement et suivre la germination', example: 'À semer en place : vos prochaines cultures' },
  { key: 'plant', label: 'Plantation et repiquage', detail: 'Mettre les plants en terre au bon moment', example: 'À planter : vos prochaines cultures' },
  { key: 'harvest', label: 'Récolte', detail: 'Récoltes estimées et tâches de récolte', example: 'À récolter : vos plantes' },
  { key: 'care', label: 'Entretien', detail: 'Les soins programmés pour vos cultures', example: 'Entretien : vos cultures' },
  { key: 'personal', label: 'Tâches personnelles', detail: 'Les tâches que vous avez ajoutées vous-même', example: 'Tâche personnelle : votre prochain geste' },
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number]['key'];
export type TaskNotificationType = Exclude<NotificationType, 'water'>;
export type NotificationPreferences = { [K in NotificationType as `notify_${K}`]: boolean };
export const DEFAULT_NOTIFICATION_PREFERENCES = Object.fromEntries(NOTIFICATION_TYPES.map(t => [`notify_${t.key}`, true])) as NotificationPreferences;

/** Les anciens réglages, sans préférence par type, conservent tous leurs rappels. */
export function notificationEnabled(settings: Partial<NotificationPreferences> | null | undefined, kind: NotificationType): boolean {
  return settings?.[`notify_${kind}`] !== false;
}

type NotificationTask = { title: string; origin: 'auto' | 'manuel'; notification_type?: TaskNotificationType | null };

/** Les anciennes tâches automatiques sont reconnues par les titres générés avant le typage. */
export function taskNotificationType(task: NotificationTask): TaskNotificationType {
  if (task.notification_type && NOTIFICATION_TYPES.some(t => t.key !== 'water' && t.key === task.notification_type)) return task.notification_type;
  if (task.origin === 'manuel') return 'personal';
  const title = task.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/^semis sous abri\b/.test(title)) return 'sow_indoor';
  if (/^(semer|semis|surveiller la levee)\b/.test(title)) return 'sow_outdoor';
  if (/^(planter|plantation|repiquer|repiquage)\b/.test(title)) return 'plant';
  if (/^(recolter|recolte)\b/.test(title)) return 'harvest';
  return 'care';
}

export const taskNotificationEnabled = (settings: Partial<NotificationPreferences> | null | undefined, task: NotificationTask) => notificationEnabled(settings, taskNotificationType(task));
