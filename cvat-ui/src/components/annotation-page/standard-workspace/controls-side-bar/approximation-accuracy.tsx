// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { CSSProperties } from 'react';
import ReactDOM from 'react-dom';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';
import { Col, Row } from 'antd/lib/grid';
import { useTranslation } from 'react-i18next';

interface Props {
    approxPolyAccuracy: number;
    onChange(value: number): void;
}

export const MAX_ACCURACY = 13;

export const APPROX_POLY_ACCURACY_MARKS = {
    0: {
        style: { color: '#46a5e5' } as CSSProperties,
        label: null as unknown as JSX.Element,
    },
    [MAX_ACCURACY]: {
        style: { color: '#61c200' } as CSSProperties,
        label: null as unknown as JSX.Element,
    },
};

export function thresholdFromAccuracy(approxPolyAccuracy: number): number {
    const approxPolyMaxDistance = MAX_ACCURACY - approxPolyAccuracy;
    let threshold = 0;
    if (approxPolyMaxDistance > 0) {
        if (approxPolyMaxDistance <= 8) {
            threshold = (2.75 * approxPolyMaxDistance - 1) / 7;
        } else {
            threshold = 2 ** (approxPolyMaxDistance - 7);
        }
    }

    return threshold;
}

function ApproximationAccuracy(props: Props): React.ReactPortal | null {
    const { t } = useTranslation();
    const { approxPolyAccuracy, onChange } = props;
    const target = window.document.getElementsByClassName('cvat-canvas-container')[0];

    const marks: Record<number, { style: CSSProperties; label: JSX.Element }> = {
        0: {
            style: { color: '#46a5e5' },
            label: <strong>{t('annotation.less')}</strong>,
        },
        [MAX_ACCURACY]: {
            style: { color: '#61c200' },
            label: <strong>{t('annotation.more')}</strong>,
        },
    };

    return target ?
        ReactDOM.createPortal(
            <Row align='middle' className='cvat-approx-poly-threshold-wrapper'>
                <Col span={5}>
                    <Text>{t('annotation.points')}: </Text>
                </Col>
                <Col offset={1} span={18}>
                    <Slider
                        value={approxPolyAccuracy}
                        min={0}
                        max={MAX_ACCURACY}
                        step={1}
                        dots
                        tooltip={{
                            open: false,
                        }}
                        onChange={onChange}
                        marks={marks}
                    />
                </Col>
            </Row>,
            target,
        ) :
        null;
}

export default React.memo(ApproximationAccuracy);
