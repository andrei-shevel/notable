import { Route, Switch } from 'wouter';
import { DesignLayout } from './_layout';
import { Overview } from './Overview';
import { ColorsPage } from './tokens/colors';
import { TypographyPage } from './tokens/typography';
import { SpacingPage } from './tokens/spacing';
import { RadiusPage } from './tokens/radius';
import { ShadowsPage } from './tokens/shadows';
import { MotionPage } from './tokens/motion';
import { ButtonPage } from './primitives/button';
import { InputPage } from './primitives/input';
import { DialogPage } from './primitives/dialog';
import { MenuPage } from './primitives/menu';
import { PopoverPage } from './primitives/popover';
import { TooltipPage } from './primitives/tooltip';
import { IconPage } from './blocks/icon';
import { TagPage } from './blocks/tag';
import { AvatarPage } from './blocks/avatar';
import { KbdPage } from './blocks/kbd';
import { SpinnerPage } from './blocks/spinner';

// Paths here are relative to /_design — App.tsx mounts this tree with
// <Route nest>, which puts us inside a wouter sub-router with base="/_design".
export default function DesignSystem() {
  return (
    <DesignLayout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/tokens/colors" component={ColorsPage} />
        <Route path="/tokens/typography" component={TypographyPage} />
        <Route path="/tokens/spacing" component={SpacingPage} />
        <Route path="/tokens/radius" component={RadiusPage} />
        <Route path="/tokens/shadows" component={ShadowsPage} />
        <Route path="/tokens/motion" component={MotionPage} />
        <Route path="/primitives/button" component={ButtonPage} />
        <Route path="/primitives/input" component={InputPage} />
        <Route path="/primitives/dialog" component={DialogPage} />
        <Route path="/primitives/menu" component={MenuPage} />
        <Route path="/primitives/popover" component={PopoverPage} />
        <Route path="/primitives/tooltip" component={TooltipPage} />
        <Route path="/blocks/icon" component={IconPage} />
        <Route path="/blocks/tag" component={TagPage} />
        <Route path="/blocks/avatar" component={AvatarPage} />
        <Route path="/blocks/kbd" component={KbdPage} />
        <Route path="/blocks/spinner" component={SpinnerPage} />
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </DesignLayout>
  );
}

function NotFound() {
  return (
    <div style={{ color: 'var(--text-muted)' }}>
      Page not found. Pick something from the sidebar.
    </div>
  );
}
