// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Col, Row } from 'antd/lib/grid';
import Input from 'antd/lib/input';

import { JobsQuery } from 'reducers';
import dimensions from 'utils/dimensions';
import {
    SortingComponent,
    ResourceFilterHOC,
    defaultVisibility,
    ResourceSelectionInfo,
} from 'components/resource-sorting-filtering';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from './jobs-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

interface Props {
    query: JobsQuery;
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
    onApplySearch(search: string | null): void;
    selectedCount: number;
    onSelectAll: () => void;
}

function TopBarComponent(props: Readonly<Props>): JSX.Element {
    const { t } = useTranslation();
    const {
        query, onApplyFilter, onApplySorting, onApplySearch, selectedCount, onSelectAll,
    } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);

    return (
        <Row className='cvat-jobs-page-top-bar' justify='center' align='middle'>
            <Col {...dimensions}>
                <div>
                    <div>
                        <Input.Search
                            enterButton
                            onSearch={(phrase: string) => {
                                onApplySearch(phrase);
                            }}
                            defaultValue={query.search ?? ''}
                            className='cvat-jobs-page-search-bar'
                            placeholder={t('jobs.searchPlaceholder')}
                        />
                        <ResourceSelectionInfo selectedCount={selectedCount} onSelectAll={onSelectAll} />
                    </div>
                    <div>
                        <SortingComponent
                            visible={visibility.sorting}
                            onVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, sorting: visible })
                            )}
                            defaultFields={query.sort?.split(',') || ['-ID']}
                            sortingFields={[
                                t('jobs.id'),
                                t('jobs.assignee'),
                                t('jobs.updatedDate'),
                                t('jobs.stage'),
                                t('jobs.state'),
                                t('jobs.taskId'),
                                t('jobs.projectId'),
                                t('jobs.taskName'),
                                t('jobs.projectName'),
                            ]}
                            onApplySorting={onApplySorting}
                        />
                        <FilteringComponent
                            value={query.filter}
                            predefinedVisible={visibility.predefined}
                            builderVisible={visibility.builder}
                            recentVisible={visibility.recent}
                            onPredefinedVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, predefined: visible })
                            )}
                            onBuilderVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visible })
                            )}
                            onRecentVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                            )}
                            onApplyFilter={onApplyFilter}
                        />
                    </div>
                </div>
            </Col>
        </Row>
    );
}

export default React.memo(TopBarComponent);
