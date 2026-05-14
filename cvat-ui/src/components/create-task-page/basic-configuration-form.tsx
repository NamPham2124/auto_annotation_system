// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';
import Form, { FormInstance } from 'antd/lib/form';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { withTranslation } from 'react-i18next';

export interface BaseConfiguration {
    name: string;
}

interface Props {
    onChange(values: BaseConfiguration): void;
    many: boolean;
    exampleMultiTaskName?: string;
    t: (key: string, options?: Record<string, unknown>) => string;
}

class BasicConfigurationForm extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;
    private inputRef: RefObject<Input>;
    private initialName: string;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
        this.inputRef = React.createRef<Input>();

        const { many } = this.props;
        this.initialName = many ? '{{file_name}}' : '';
    }

    componentDidMount(): void {
        const { onChange } = this.props;
        onChange({
            name: this.initialName,
        });
    }

    private handleChangeName(e: React.ChangeEvent<HTMLInputElement>): void {
        const { onChange } = this.props;
        onChange({
            name: e.target.value,
        });
    }

    public submit(): Promise<void> {
        if (this.formRef.current) {
            return this.formRef.current.validateFields();
        }

        return Promise.reject(new Error('Form ref is empty'));
    }

    public resetFields(): void {
        if (this.formRef.current) {
            this.formRef.current.resetFields();
        }
    }

    public focus(): void {
        if (this.inputRef.current) {
            this.inputRef.current.focus();
        }
    }

    public render(): JSX.Element {
        const { many, exampleMultiTaskName, t } = this.props;

        return (
            <Form ref={this.formRef} layout='vertical'>
                <Form.Item
                    className={many ? 'cvat-task-name-field-has-tooltip' : ''}
                    hasFeedback
                    name='name'
                    label={<span>{t('tasks.taskName')}</span>}
                    rules={[
                        {
                            required: true,
                            message: t('tasks.taskNameCannotBeEmpty'),
                        },
                    ]}
                    initialValue={this.initialName}
                >
                    <Input
                        ref={this.inputRef}
                        onChange={(e) => this.handleChangeName(e)}
                    />
                </Form.Item>
                {many ? (
                    <Text type='secondary'>
                        <Tooltip title={() => (
                            <>
                                {t('tasks.multiTaskTemplate')}
                                <ul>
                                    <li>
                                        {t('tasks.multiTaskSomeText')}
                                    </li>
                                    <li>
                                        {'{{'}
                                        index
                                        {'}}'}
                                        &nbsp;- {t('tasks.multiTaskIndex')}
                                    </li>
                                    <li>
                                        {'{{'}
                                        file_name
                                        {'}}'}
                                        &nbsp;- {t('tasks.multiTaskFileName')}
                                    </li>
                                </ul>
                                {t('tasks.multiTaskExample')}&nbsp;
                                <i>
                                    {exampleMultiTaskName || 'Task name 1 - video_1.mp4'}
                                </i>
                            </>
                        )}
                        >
                            {t('tasks.multiTaskTemplateUsed')}
                            {' '}
                            <QuestionCircleOutlined />
                        </Tooltip>
                    </Text>
                ) : null}
            </Form>
        );
    }
}

export default withTranslation()(BasicConfigurationForm as any);
