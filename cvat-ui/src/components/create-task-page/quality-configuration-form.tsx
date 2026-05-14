// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import Input from 'antd/lib/input';
import Form, { FormInstance } from 'antd/lib/form';
import { PercentageOutlined } from '@ant-design/icons';
import Radio from 'antd/lib/radio';
import { Col, Row } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import { withTranslation } from 'react-i18next';

import { FrameSelectionMethod } from 'components/create-job-page/job-form';

export interface QualityConfiguration {
    validationMode: ValidationMode;
    validationFramesPercent?: number;
    validationFramesPerJobPercent?: number;
    frameSelectionMethod: FrameSelectionMethod;
}

interface Props {
    initialValues: QualityConfiguration;
    frameSelectionMethod: FrameSelectionMethod;
    validationMode: ValidationMode;
    onSubmit(values: QualityConfiguration): Promise<void>;
    onChangeFrameSelectionMethod: (method: FrameSelectionMethod) => void;
    onChangeValidationMode: (method: ValidationMode) => void;
    t: (key: string, options?: Record<string, unknown>) => string;
}

export enum ValidationMode {
    NONE = 'none',
    GT = 'gt',
    HONEYPOTS = 'gt_pool',
}

export default class QualityConfigurationForm extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
    }

    public submit(): Promise<void> {
        const { onSubmit } = this.props;
        if (this.formRef.current) {
            return this.formRef.current.validateFields().then((values: QualityConfiguration) => onSubmit({
                ...values,
                frameSelectionMethod: values.validationMode === ValidationMode.HONEYPOTS ?
                    FrameSelectionMethod.RANDOM : values.frameSelectionMethod,
                ...(typeof values.validationFramesPercent === 'number' ? {
                    validationFramesPercent: values.validationFramesPercent / 100,
                } : {}),
                ...(typeof values.validationFramesPerJobPercent === 'number' ? {
                    validationFramesPerJobPercent: values.validationFramesPerJobPercent / 100,
                } : {}),
            }),
            );
        }

        return Promise.reject(new Error('Quality form ref is empty'));
    }

    public resetFields(): void {
        this.formRef.current?.resetFields(['validationFramesPercent', 'validationFramesPerJobPercent', 'frameSelectionMethod']);
    }

    private gtParamsBlock(): JSX.Element {
        const { frameSelectionMethod, onChangeFrameSelectionMethod, t } = this.props as Props;

        return (
            <>
                <Col>
                    <Form.Item
                        name='frameSelectionMethod'
                        label={t('tasks.qualitySettings.frameSelectionMethod')}
                        rules={[{ required: true, message: t('tasks.qualitySettings.pleaseSpecifyFrameSelectionMethod') }]}
                    >
                        <Select
                            className='cvat-select-frame-selection-method'
                            onChange={onChangeFrameSelectionMethod}
                        >
                            <Select.Option value={FrameSelectionMethod.RANDOM}>{t('tasks.qualitySettings.random')}</Select.Option>
                            <Select.Option value={FrameSelectionMethod.RANDOM_PER_JOB}>{t('tasks.qualitySettings.randomPerJob')}</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>

                {
                    frameSelectionMethod === FrameSelectionMethod.RANDOM && (
                        <Col span={7}>
                            <Form.Item
                                label={t('tasks.qualitySettings.quantity')}
                                name='validationFramesPercent'
                                normalize={(value) => +value}
                                rules={[
                                    { required: true, message: t('validation.required') },
                                    {
                                        type: 'number', min: 0, max: 100, message: t('tasks.qualitySettings.valueIsNotValid'),
                                    },
                                ]}
                            >
                                <Input
                                    size='large'
                                    type='number'
                                    min={0}
                                    max={100}
                                    suffix={<PercentageOutlined />}
                                />
                            </Form.Item>
                        </Col>
                    )
                }
                {
                    frameSelectionMethod === FrameSelectionMethod.RANDOM_PER_JOB && (
                        <Col span={7}>
                            <Form.Item
                                label={t('tasks.qualitySettings.quantityPerJob')}
                                name='validationFramesPerJobPercent'
                                normalize={(value) => +value}
                                rules={[
                                    { required: true, message: t('validation.required') },
                                    {
                                        type: 'number', min: 0, max: 100, message: t('tasks.qualitySettings.valueIsNotValid'),
                                    },
                                ]}
                            >
                                <Input
                                    size='large'
                                    type='number'
                                    min={0}
                                    max={100}
                                    suffix={<PercentageOutlined />}
                                />
                            </Form.Item>
                        </Col>
                    )
                }
            </>
        );
    }

    private honeypotsParamsBlock(): JSX.Element {
        const { t } = this.props as Props;
        return (
            <Row>
                <Col span={7}>
                    <Form.Item
                        label={t('tasks.qualitySettings.totalHoneypots')}
                        name='validationFramesPercent'
                        normalize={(value) => +value}
                        rules={[
                            { required: true, message: t('validation.required') },
                            {
                                type: 'number', min: 0, max: 100, message: t('tasks.qualitySettings.valueIsNotValid'),
                            },
                        ]}
                    >
                        <Input size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                    </Form.Item>
                </Col>
                <Col span={7} offset={1}>
                    <Form.Item
                        label={t('tasks.qualitySettings.overheadPerJob')}
                        name='validationFramesPerJobPercent'
                        normalize={(value) => +value}
                        rules={[
                            { required: true, message: t('validation.required') },
                            {
                                type: 'number', min: 0, max: 100, message: t('tasks.qualitySettings.valueIsNotValid'),
                            },
                        ]}
                    >
                        <Input size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                    </Form.Item>
                </Col>
            </Row>
        );
    }

    public render(): JSX.Element {
        const { initialValues, validationMode, onChangeValidationMode, t } = this.props as Props;

        let paramsBlock: JSX.Element | null = null;
        if (validationMode === ValidationMode.GT) {
            paramsBlock = this.gtParamsBlock();
        } else if (validationMode === ValidationMode.HONEYPOTS) {
            paramsBlock = this.honeypotsParamsBlock();
        }

        return (
            <Form
                layout='vertical'
                initialValues={initialValues}
                ref={this.formRef}
            >
                <Form.Item
                    label={t('tasks.qualitySettings.validationMode')}
                    name='validationMode'
                    rules={[{ required: true }]}
                >
                    <Radio.Group
                        buttonStyle='solid'
                        onChange={(e) => {
                            onChangeValidationMode(e.target.value);
                        }}
                    >
                        <Radio.Button value={ValidationMode.NONE} key={ValidationMode.NONE}>
                            {t('tasks.qualitySettings.validationModeNone')}
                        </Radio.Button>
                        <Radio.Button value={ValidationMode.GT} key={ValidationMode.GT}>
                            {t('tasks.qualitySettings.validationModeGT')}
                        </Radio.Button>
                        <Radio.Button value={ValidationMode.HONEYPOTS} key={ValidationMode.HONEYPOTS}>
                            {t('tasks.qualitySettings.validationModeHoneypots')}
                        </Radio.Button>
                    </Radio.Group>
                </Form.Item>
                { paramsBlock }
            </Form>
        );
    }
}
