# Landing theme comparison

Only two themes remain:

- Playground (internal key `original`): the original colours, cool light background, bold headings, and original shadows.
- Soft Focus (default, internal key `combined`): the same purple, teal, coral, amber, cream, and sky-blue accents with warm-white surfaces, calmer headings, gentler shadows, and a less rotated demo backdrop.

Both retain the blueprint brain mark. The other experimental theme definitions and styles have been removed.

The header Appearance button opens a theme menu with palette previews, descriptions, and selected-state checks. It supports arrow keys, Home/End, Space/Enter, Escape, outside-click dismissal, and visible keyboard focus. Internal keys remain stable to preserve existing saved preferences.

The switcher lives on the landing page but controls the root document's appearance across the app, including authentication, dashboard, Lounge, admin, and portalled dialogs/chat. A dedicated, validated appearance cookie remembers the choice for a year in the same browser. The root server layout reads it before rendering to avoid a different-theme flash on refresh. No account/database setting is modified; other browsers have independent choices. Missing or invalid preferences fall back to Combined.

Root semantic surface/text/border tokens, heading weight, and shared shadows change together. Game-piece colours, success/failure feedback, and destructive actions are not remapped. Future components should use semantic tokens instead of hardcoded neutral colours to inherit appearance automatically. Landing-specific composition tweaks remain scoped to the landing stylesheet. No online deployment is included.
