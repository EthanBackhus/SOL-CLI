/*
// boost rockets
var payload = {emoji: "rocket"};

async function boostRocket(url: string, data: any) {
    try {
        const response = await fetch(url, {
            method: 'POST', // Specify the request method
            headers: {
                'Accept': '',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.9',
                'Content-Type': 'application/json',
                'Origin': 'https://dexscreener.com',
                'Priority': 'u=1, i',
                'Referer': 'https://dexscreener.com/',
                'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(data) // Convert data to JSON string
        });

        if (!response.ok) {
            console.log("There was an error processing the transaction: ", response.statusText);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Success:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

// URL to make the POST request to
const url = 'https://io.dexscreener.com/hype/reactions/dexPair/solana:CcRz18nGvM5se1iZJ2HnkgCx1U92wnwQBLtyPKkFVo53';

// Call the function with the URL and request data
boostRocket(url, payload);
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function makeFetchRequest() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'https://io.dexscreener.com/hype/reactions/dexPair/solana:JEE5TQLs4j4C7D9ETdy5FHbKgeS2VqemfTwroNcy1KkZ';
        const headers = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Origin': 'https://dexscreener.com',
            'Referer': 'https://dexscreener.com/',
            'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Access-Control-Allow-Credentials': 'true'
        };
        const payload = {
            emoji: "rocket"
        };
        try {
            const response = yield fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                credentials: 'include' // Include credentials in the request
            });
            if (response.ok) {
                const data = yield response.json();
                console.log('Fetch Response data:', data);
            }
            else {
                console.error('Fetch request failed:', response.status, response.statusText);
            }
        }
        catch (error) {
            console.error('Error making fetch request:', error);
        }
    });
}
// Make the Fetch request
makeFetchRequest();
//# sourceMappingURL=buttonSim.js.map