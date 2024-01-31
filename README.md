# Insight

# Setup Instructions

# Clone the Repository

First, clone this repository to your local machine:

git clone git@github.com:alaricli/insight.git

# Start the Backend

Navigate to the root directory of the project and start the TypeScript back end:

``` cd Insight
``` npm start

# Start the Frontend

Navigate to the "frontend" folder and start the React front end:

cd frontend
npm install
npm start

# Download Sample Dataset

To use the project effectively, you'll need a sample dataset. Download it [here](https://github.com/ubccpsc/310/raw/main/resources/archives/pair.zip):

# Input Dataset Using Postman

To upload the dataset to the back end, follow these steps:

Open Postman or install it if you haven't already.
Create a POST request with the following URL: http://localhost:4321/dataset/courses/sections.
In the request body, upload the downloaded zip file using the appropriate field or parameter (check your back-end code for the exact field name).

# Access the Project

Once the back end is running, and you've uploaded the dataset, you can access the project through your web browser:

http://localhost:3000

# Usage

Explore and interact with the project to analyze and visualize the dataset you've uploaded.
Modify the TypeScript back end and React front end to suit your specific needs and requirements.
This README provides a basic setup guide. Please refer to project documentation and code comments for more detailed information about the features and functionality of Insight.
