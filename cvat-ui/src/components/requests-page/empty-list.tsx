// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Empty from 'antd/lib/empty';
import { useTranslation } from 'react-i18next';

export default function EmptyListComponent(): JSX.Element {
    const { t } = useTranslation();

    return (
        <div className='cvat-empty-requests-list'>
            <Empty description={(
                <>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text strong>{t('requests.emptyDescription')}</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text type='secondary'>{t('requests.emptyHint')}</Text>
                        </Col>
                    </Row>
                </>
            )}
            />
        </div>
    );
}
