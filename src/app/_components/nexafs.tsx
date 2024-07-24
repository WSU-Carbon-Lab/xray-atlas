import React from "react";

// Main page element that plots the nexafs data
export const SamplePicker = () => {
  return (
    <div>
      <h1>Sample Picker</h1>
      <p>Choose a sample</p>
      <select>
        <option value="sample1">Sample 1</option>
        <option value="sample2">Sample 2</option>
        <option value="sample3">Sample 3</option>
      </select>
    </div>
  );
};

export const ExperimentPicker = () => {
  return (
    <div>
      <h1>Experiment Picker</h1>
      <p>Choose an experiment</p>
      <select>
        <option value="exp1">Experiment 1</option>
        <option value="exp2">Experiment 2</option>
        <option value="exp3">Experiment 3</option>
      </select>
    </div>
  );
};

export const Nexafs = () => {
  return (
    <div>
      <h1>Nexafs</h1>
      <p>Plot of Nexafs data</p>
    </div>
  );
};
