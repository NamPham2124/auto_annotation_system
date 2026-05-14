// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown } from 'antd';
import { GlobalOutlined, TranslationOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd/lib/menu';

import { changeLanguage, getCurrentLanguage } from 'i18n';

function LanguageSwitcher(): JSX.Element {
    const { t } = useTranslation();
    const currentLang = getCurrentLanguage();

    const items: MenuProps['items'] = [
        {
            key: 'en',
            icon: <GlobalOutlined />,
            label: 'English',
            onClick: () => changeLanguage('en'),
        },
        {
            key: 'vi',
            icon: <TranslationOutlined />,
            label: 'Tiếng Việt',
            onClick: () => changeLanguage('vi'),
        },
    ];

    const buttonText = currentLang === 'vi' ? 'VI' : 'EN';

    return (
        <Dropdown
            menu={{ items }}
            trigger={['click']}
            placement='bottomRight'
        >
            <Button
                icon={<TranslationOutlined />}
                size='large'
                className='cvat-language-switcher-button cvat-header-button'
                type='text'
            >
                {buttonText}
            </Button>
        </Dropdown>
    );
}

export default React.memo(LanguageSwitcher);
