// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import Empty from 'antd/lib/empty';

interface Props {
    notFound: boolean;
}

function EmptyListComponent(props: Props): JSX.Element {
    const { t } = useTranslation();
    const { notFound } = props;

    return (
        <div className='cvat-empty-tasks-list'>
            <Empty description={notFound ?
                (<Text strong>{t('common.noData')}</Text>) : (
                    <>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>{t('tasks.empty')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>{t('tasks.emptyDescription')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Link to='/tasks/create'>{t('tasks.create')}</Link>
                            </Col>
                        </Row>
                    </>
                )}
            />
        </div>
    );
}

export default React.memo(EmptyListComponent);
