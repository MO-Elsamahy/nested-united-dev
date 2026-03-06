import React from 'react';

interface GathernIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
}

export const GathernIcon: React.FC<GathernIconProps> = ({ size = 24, className, ...props }) => {
    return (
        <svg
            viewBox="0 0 132.2 132.2"
            width={size}
            height={size}
            fill="none"
            className={className}
            {...props}
        >
            <path
                fill="currentColor"
                d="M132.2,125h-55v-91.5c0-20.8-17-37.7-37.7-37.7s-37.7,17-37.7,37.7v91.5H0V33.5C0,15,15,0,33.5,0S67,15,67,33.5V125h55v-91.5c0-5.5,4.5-10,10.2-10s10.2,4.5,10.2,10V125z"
            />
        </svg>
    );
};
