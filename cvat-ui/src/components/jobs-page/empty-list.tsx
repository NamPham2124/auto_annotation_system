// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
        <div className='cvat-empty-jobs-list'>
            <Empty description={notFound ?
                (<Text strong>{t('jobs.noResults')}</Text>) : (
                    <>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>{t('jobs.noJobsCreated')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>{t('jobs.toGetStarted')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Link to='/tasks/create'>{t('jobs.createTask')}</Link>
                                <Text type='secondary'> {t('common.or')} </Text>
                                <Link to='/projects/create'>{t('jobs.createProject')}</Link>
                            </Col>
                        </Row>
                    </>
                )}
            />
        </div>
    );
}

export default React.memo(EmptyListComponent);
