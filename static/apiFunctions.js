/**
 * A helper function that makes a POST request given a FormData object with the appropriate
 * parameters.
 * @param {url} url - the url to make the request to
 * @param {FormData} formData A form data object containing the parameters for the request.
 * @returns {Object|string} A JSON object or plaintext containing the response from the endpoint.
 */
async function makePostRequest(url, formData) {
  const requestOptions = {
    method: "POST",
    body: formData,
    redirect: "follow"
  };

  const response = await makeRequest(url, requestOptions);
  return response;
}

/**
 * Makes a request to the bigtwos depending on the passed in endpoint and
 * returns the response.
 * @param {string} url The endpoint to make the request to.
 * @param {Object.<string, string|FormData>} requestOptions An optional parameter which is an empty object
 * by default (for GET requests). Should contain the parameters and options for
 * any POST requests made.
 * @return {(object|string)} A JSON object or a plaintext string depending on the
 * format of the response.
 */
async function makeRequest(url, requestOptions = {}) {
  try {
    let response = await fetch(url, requestOptions);
    await statusCheck(response);
    let data = await response.text();
    return isValidJSON(data);
  } catch (err) {
    throw err;
  }
}

/**
 * Helper function to return the response's result text if successful, otherwise
 * returns the rejected Promise result with an error status and corresponding text
 * @param {object} res - response to check for success/error
 * @return {object} - valid response if response was successful, otherwise rejected
 *                    Promise result
 */
async function statusCheck(res) {
  try {
    if (!res.ok) {
      let text = await res.text();
      if (res.status == 402) {
        window.location.reload();
      } else {
        throw new Error("non 402 error:\n" + text);
      }
    }
    return res;
  } catch (err) {
    throw err;
  }
}

/**
 * Checks whether the passed in string is a valid JSON string.
 * @param {string} data The string to check.
 * @return {(object|string)} The parsed JSON object if the string is valid JSON,
 * or the original string if not.
 */
function isValidJSON(data) {
  let json;
  try {
    json = JSON.parse(data);
  } catch (e) {
    return data;
  }
  return json;
}

export { makePostRequest, makeRequest, statusCheck, isValidJSON };
