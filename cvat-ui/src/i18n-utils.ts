// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';

export function t(key: string, options?: Record<string, unknown>): string {
    return i18n.t(key, options);
}

export function getCurrentLanguage(): string {
    return i18n.language;
}

export function getAvailableLanguages(): { code: string; name: string }[] {
    return [
        { code: 'en', name: 'English' },
        { code: 'vi', name: 'Tiếng Việt' },
    ];
}
