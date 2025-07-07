// components/RadioButtonGroup.tsx
import React from 'react';

type RadioButtonGroupProps = {
  options: (number | null)[];         // number だけでなく null を含むなら、こういった定義も可
  selectedOption: number | string;
  onChange: (value: number | null) => void;
  groupName: string;                  // ラジオボタンの name 属性に使う
  labelFormatter?: (value: number | null) => string;
  // ↑ ラベルに表示する文言を変換したいときに使うオプション
};

export const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  options,
  selectedOption,
  onChange,
  groupName,
  labelFormatter = (val) => String(val),
}) => {
  return (
    <div>
      {options.map((option) => {
        // 各optionがnullなら特別に「未選択」と表示するなど
        const labelText = labelFormatter(option);

        return (
          <label
            key={String(option)}
            className="mr-4 inline-flex items-center"
            style={{
              color: selectedOption === option ? '#2563eb' : undefined,
              fontWeight: selectedOption === option ? 700 : undefined,
            }}
          >
            <input
              type="radio"
              name={groupName}
              value={String(option)}
              checked={selectedOption === option}
              onChange={() => onChange(option)}
              className="mr-1 accent-[#2563eb]"
            />
            {labelText}
          </label>
        );
      })}
    </div>
  );
};
