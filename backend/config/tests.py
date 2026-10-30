from django.test import SimpleTestCase, override_settings


class HomeRedirectTests(SimpleTestCase):
    @override_settings(FRONTEND_URL='https://www.example.com')
    def test_root_redirects_to_the_frontend_homepage(self):
        response = self.client.get('/')

        self.assertRedirects(
            response,
            'https://www.example.com',
            fetch_redirect_response=False,
        )
