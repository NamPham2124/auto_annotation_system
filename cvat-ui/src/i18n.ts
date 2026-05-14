// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

const resources = {
    en: { translation: en },
    vi: { translation: vi },
};

const savedLanguage = localStorage.getItem('cvat-language') || 'en';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: savedLanguage,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export function changeLanguage(lang: string): void {
    localStorage.setItem('cvat-language', lang);
    i18n.changeLanguage(lang);
}

export function getCurrentLanguage(): string {
    return i18n.language;
}

export default i18n;
