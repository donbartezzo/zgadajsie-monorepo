/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

export const Button: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('div', { className: 'email-button', ...props }, children);
export const Container: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('div', { className: 'email-container', ...props }, children);
export const Head: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('head', props, children);
export const Html: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('html', props, children);
export const Link: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('a', { className: 'email-link', ...props }, children);
export const Preview: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('div', { className: 'email-preview', ...props }, children);
export const Section: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('section', { className: 'email-section', ...props }, children);
export const Text: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('p', { className: 'email-text', ...props }, children);
export const Row: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('div', { className: 'email-row', ...props }, children);
export const Column: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('div', { className: 'email-column', ...props }, children);
export const Img: React.FC<React.PropsWithChildren<any>> = (props) =>
  React.createElement('img', { className: 'email-img', ...props });
export const Font: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('style', props, children);
export const Body: React.FC<React.PropsWithChildren<any>> = ({ children, ...props }) =>
  React.createElement('body', props, children);
export const Hr: React.FC<React.PropsWithChildren<any>> = (props) =>
  React.createElement('hr', { className: 'email-hr', ...props });
