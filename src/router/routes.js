import { isFeatureEnabled } from '../config/features'

/**
 * Routes de l'application.
 *
 * La propriété `feature` (non standard, retirée avant d'atteindre vue-router)
 * rattache une route à un module optionnel : si le club l'a désactivé dans
 * `club.config.js`, la route n'est pas déclarée du tout et l'URL retombe sur
 * la page 404 (ADR-030).
 */
const childRoutes = [
  { path: '', component: () => import('pages/IndexPage.vue') },
  { path: 'weather', component: () => import('pages/WeatherPage.vue') },
  { path: 'azba', component: () => import('pages/AzbaPage.vue') },
  { path: 'temsi', component: () => import('pages/TemsiPage.vue') },
  { path: 'wintem', component: () => import('pages/WintemPage.vue') },
  { path: 'station', component: () => import('pages/StationPage.vue'), feature: 'station' },
  {
    path: 'stress-thermique',
    component: () => import('pages/StressThermiquePage.vue'),
    feature: 'thermal',
  },
  { path: 'webcam', component: () => import('pages/WebcamPage.vue'), feature: 'webcam' },
  { path: 'ephemerides', component: () => import('pages/EphemerisPage.vue') },
  {
    path: 'preparation',
    component: () => import('pages/PreparationPage.vue'),
    feature: 'aircraft',
  },
  { path: 'notam', component: () => import('pages/NotamPage.vue') },
  { path: 'vac', component: () => import('pages/VacPage.vue') },
  { path: 'rex-ffa', component: () => import('pages/RexFfaPage.vue'), feature: 'rex' },
  { path: 'rex-soumission', redirect: '/rex-ffa?tab=soumission', feature: 'rex' },
  {
    path: 'notifications',
    component: () => import('pages/NotificationSettings.vue'),
    feature: 'notifications',
  },
  { path: 'customization', component: () => import('pages/CustomizationPage.vue') },
  { path: 'vfr-settings', component: () => import('pages/VfrSettingsPage.vue') },
  { path: 'status', component: () => import('pages/StatusPage.vue') },
]

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: childRoutes
      .filter((r) => isFeatureEnabled(r.feature))
      // eslint-disable-next-line no-unused-vars
      .map(({ feature, ...route }) => route),
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
