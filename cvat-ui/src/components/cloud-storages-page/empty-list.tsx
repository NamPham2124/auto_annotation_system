// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';

import Empty from 'antd/lib/empty';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import { CloudOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

interface Props {
    notFound: boolean;
}

export default function EmptyListComponent(props: Props): JSX.Element {
    const { t } = useTranslation();
    const { notFound } = props;

    return (
        <div className='cvat-empty-cloud-storages-list'>
            <Empty
                description={notFound ? (
                    <Text strong>{t('cloudStorages.noResults')}</Text>
                ) : (
                    <>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>{t('cloudStorages.noCloudStoragesAttached')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>{t('cloudStorages.toGetStarted')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Link to='/cloudstorages/create'>{t('cloudStorages.attachNewOne')}</Link>
                            </Col>
                        </Row>
                    </>
                )}
                image={notFound ? Empty.PRESENTED_IMAGE_DEFAULT : <CloudOutlined className='cvat-empty-cloud-storages-list-icon' />}
            />
        </div>
    );
}
