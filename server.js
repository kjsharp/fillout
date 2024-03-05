const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;
const ENDPOINT = "https://api.fillout.com/v1/api/forms/";
const APIKEY = "sk_prod_TfMbARhdgues5AuIosvvdAC9WsA5kXiZlW8HZPaRDlIbCpSpLsXBeZO7dCVZQwHAY3P4VSBPiiC33poZ1tdUj2ljOzdTCCOSpUZ_3912";
let filters = [];

app.get("/:formID/filteredResponses", async (request, response) => {
	const { formID } = request.params;
	
	if (request.query.filters) {
		const queryString = request.query.filters;
		filters = JSON.parse(decodeURIComponent(queryString));
	}
	
    let submissions = await fetchSubmissions(`${ENDPOINT}${formID}/submissions`);
	submissions = submissions.filter(response => {
		return response.questions.every(filterResponses);
	});

	response.json({ "responses": submissions });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

async function fetchSubmissions(url) {
    let allResponses = [];
    let currentPage = 1;
    let totalPages = 1;
	let perPage = 150;

    // Fetch data for each page
    while (currentPage <= totalPages) {
        try {
			let pageUrl = url;
			if (currentPage > 1) {
				pageUrl += `?limit=${perPage}&offset=${(perPage * (currentPage - 1))}`;
			}
			
			let page = await axios.get(pageUrl, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${APIKEY}`
				}
			});

            // Accumulate data from this page
            allResponses = allResponses.concat(page.data.responses);

            // Update total pages
            totalPages = page.data.pageCount;

			if (currentPage == 1 && totalPages > 1) {
				perPage = page.data.responses.length;
			}

            // Move to the next page
            currentPage++;
        } catch (error) {
            console.error('Error fetching data:', error);
            break; // Break the loop on error
        }
    }

    return allResponses;
}

// narrow responses based on filters
const filterResponses = (question, index, array) => {
	if (!filters.length) return true;
	
	let match = true;
	filters.forEach(filter => {
		if (question['id'] == filter.id) { // filter matches question
			if (!compareValues(question['value'], filter.value, filter.condition)) {
				match = false;
			} 
		}
	});
	return match;
}

// compare two values by operator
const compareValues = (value1, value2, operator) => {
    switch (operator) {
        case 'equals':
            return value1 === value2;
        case 'does_not_equal':
            return value1 !== value2;
		case 'greater_than':
			return convertValue(value1) > convertValue(value2);
		case 'less_than':
			return convertValue(value1) < convertValue(value2);
        default:
            throw new Error('Invalid operator');
    }
}

// if values are strings, check for dates
const convertValue = (value) => {
    if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return value;
}